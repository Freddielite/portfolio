package xyz.wyntek.admin;

import android.Manifest;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.OpenableColumns;
import android.provider.Settings;
import android.util.Base64;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

/**
 * Hands the web admin what the phone asked the app to do:
 *  - a long-press shortcut on the app icon (New post, Subscribers, Site health),
 *  - something shared to the app from another app (text, a link or photos), and
 *  - a link to the admin opened from anywhere (an email, a chat, an alert).
 *
 * All arrive as one "adminIntent" event. The event is kept until the web page is
 * ready to listen (retainUntilConsumed), so it also works when the share, the
 * shortcut or the link is what starts the app.
 *
 * It also runs phone alerts for the admin (Alerts.java, AlertWorker.java).
 */
@CapacitorPlugin(
    name = "AdminBridge",
    permissions = { @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS }) }
)
public class AdminBridge extends Plugin {

    static final String ACTION_SHORTCUT = "xyz.wyntek.admin.SHORTCUT";
    private static final String HANDLED = "xyz.wyntek.admin.HANDLED";
    private static final int MAX_IMAGES = 6;
    private static final int MAX_IMAGE_BYTES = 20 * 1024 * 1024;

    @Override
    public void load() {
        handle(getActivity().getIntent());
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        handle(intent);
    }

    private void handle(Intent intent) {
        if (intent == null) return;
        // Android hands the original intent back when the app is reopened from the
        // recent apps list, or after the system restarted it. Each one counts once.
        if ((intent.getFlags() & Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY) != 0) return;
        if (intent.getBooleanExtra(HANDLED, false)) return;

        String action = intent.getAction();
        if (ACTION_SHORTCUT.equals(action)) {
            intent.putExtra(HANDLED, true);
            JSObject out = new JSObject();
            out.put("kind", "shortcut");
            out.put("dest", intent.getStringExtra("dest"));
            notifyListeners("adminIntent", out, true);
        } else if (Intent.ACTION_SEND.equals(action) || Intent.ACTION_SEND_MULTIPLE.equals(action)) {
            intent.putExtra(HANDLED, true);
            readShare(intent);
        } else if (Intent.ACTION_VIEW.equals(action) && isAdminLink(intent.getData())) {
            intent.putExtra(HANDLED, true);
            JSObject out = new JSObject();
            out.put("kind", "link");
            out.put("url", intent.getData().toString());
            notifyListeners("adminIntent", out, true);
        }
    }

    // Only https links to this site's /admin count; anything else is not ours.
    private boolean isAdminLink(Uri url) {
        if (url == null || !"https".equalsIgnoreCase(url.getScheme())) return false;
        String server = getBridge().getServerUrl();
        String host = server == null ? null : Uri.parse(server).getHost();
        if (host == null || !host.equalsIgnoreCase(url.getHost())) return false;
        String path = url.getPath() == null ? "" : url.getPath();
        return path.equals("/admin") || path.startsWith("/admin/");
    }

    // ---------- App lock (AppLock.java, MainActivity) ----------

    /** Called by MainActivity when the app comes back and must lock. */
    void askForLock() {
        // Not kept for later: a page that loads afterwards asks appLockPending itself.
        notifyListeners("appLock", new JSObject(), false);
    }

    @PluginMethod
    public void appLockConfigure(PluginCall call) {
        Boolean enabled = call.getBoolean("enabled", false);
        Double after = call.getDouble("lockAfterMs");
        String background = call.getString("background", "#0b1020");
        AppLock.configure(getContext(), enabled != null && enabled, after == null ? 0 : after.longValue(), background);
        call.resolve();
    }

    @PluginMethod
    public void appLockPending(PluginCall call) {
        JSObject out = new JSObject();
        out.put("pending", AppLock.pending(getContext()));
        call.resolve(out);
    }

    @PluginMethod
    public void appLockShown(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (getActivity() instanceof MainActivity) ((MainActivity) getActivity()).lockShown();
            else AppLock.setPending(getContext(), false);
        });
        call.resolve();
    }

    @PluginMethod
    public void appLockQuiet(PluginCall call) {
        Double ms = call.getDouble("ms");
        AppLock.quiet(getContext(), ms == null ? 0 : ms.longValue());
        call.resolve();
    }

    // ---------- Phone alerts ----------

    private JSObject alertsState() {
        SharedPreferences p = Alerts.prefs(getContext());
        JSObject out = new JSObject();
        out.put("supported", true);
        out.put("on", Alerts.isOn(getContext()));
        out.put("id", p.getString("id", null));
        out.put("health", p.getBoolean("health", true));
        out.put("subscribers", p.getBoolean("subscribers", true));
        out.put("deploys", p.getBoolean("deploys", true));
        out.put("lastCheck", p.getLong("lastCheck", 0));
        out.put("lastTry", p.getLong("lastTry", 0));
        out.put("lastError", p.getString("lastError", null));
        out.put("permission", permission());
        return out;
    }

    private String permission() {
        if (Alerts.allowed(getContext())) return "granted";
        if (Build.VERSION.SDK_INT < 33) return "denied"; // switched off in Android settings
        PermissionState state = getPermissionState("notifications");
        return state == PermissionState.DENIED ? "denied" : "prompt";
    }

    @PluginMethod
    public void alertsStatus(PluginCall call) {
        call.resolve(alertsState());
    }

    @PluginMethod
    public void requestNotifications(PluginCall call) {
        if (Build.VERSION.SDK_INT < 33 || Alerts.allowed(getContext())) {
            call.resolve(alertsState());
            return;
        }
        requestPermissionForAlias("notifications", call, "notificationsAnswered");
    }

    @PermissionCallback
    private void notificationsAnswered(PluginCall call) {
        call.resolve(alertsState());
    }

    @PluginMethod
    public void alertsEnable(PluginCall call) {
        String base = call.getString("base");
        String id = call.getString("id");
        String token = call.getString("token");
        if (base == null || !base.startsWith("https://") || id == null || token == null) {
            call.reject("Missing the site address or this phone's alert token.");
            return;
        }
        // The checks are only ever sent to this app's own site, whatever the page asks for.
        String site = getBridge().getServerUrl();
        String baseHost = Uri.parse(base).getHost();
        String siteHost = site == null ? null : Uri.parse(site).getHost();
        if (baseHost == null || siteHost == null || !baseHost.equalsIgnoreCase(siteHost)) {
            call.reject("Alerts can only be set up for this app's own site.");
            return;
        }
        Alerts.enable(getContext(), base, id, token,
            call.getBoolean("health", true), call.getBoolean("subscribers", true), call.getBoolean("deploys", true));
        call.resolve(alertsState());
    }

    @PluginMethod
    public void alertsSetKinds(PluginCall call) {
        Alerts.setKinds(getContext(), call.getBoolean("health"), call.getBoolean("subscribers"), call.getBoolean("deploys"));
        call.resolve(alertsState());
    }

    @PluginMethod
    public void alertsDisable(PluginCall call) {
        JSObject out = new JSObject();
        out.put("id", Alerts.disable(getContext()));
        call.resolve(out);
    }

    @PluginMethod
    public void alertsCheckNow(PluginCall call) {
        if (Alerts.isOn(getContext())) Alerts.checkNow(getContext());
        call.resolve(alertsState());
    }

    @PluginMethod
    public void alertsTest(PluginCall call) {
        Alerts.notify(getContext(), Alerts.CH_HEALTH, Alerts.ID_TEST, "Alerts are working",
            "This is how alerts from your admin will look. Tap to open the Overview.", null, Alerts.link(getContext(), "#overview"));
        call.resolve(alertsState());
    }

    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        Intent i;
        if (Build.VERSION.SDK_INT >= 26) {
            i = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
        } else {
            i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getContext().getPackageName()));
        }
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(i);
        call.resolve();
    }

    // Reading photos can take a moment, so it runs off the main thread.
    private void readShare(final Intent intent) {
        final String text = intent.getStringExtra(Intent.EXTRA_TEXT);
        String subject = intent.getStringExtra(Intent.EXTRA_SUBJECT);
        if (subject == null) subject = intent.getStringExtra(Intent.EXTRA_TITLE);
        final String title = subject;
        final List<Uri> uris = streams(intent);

        new Thread(() -> {
            JSArray images = new JSArray();
            int n = 0;
            for (Uri uri : uris) {
                if (n >= MAX_IMAGES) break;
                try {
                    String type = getContext().getContentResolver().getType(uri);
                    if (type == null || !type.startsWith("image/")) continue;
                    byte[] bytes = readBytes(uri);
                    if (bytes == null) continue;
                    n++;
                    JSObject img = new JSObject();
                    img.put("name", displayName(uri, n));
                    img.put("type", type);
                    img.put("data", Base64.encodeToString(bytes, Base64.NO_WRAP));
                    images.put(img);
                } catch (Exception ignored) {
                    // a photo that cannot be read is skipped; the rest still come through
                }
            }
            final JSObject out = new JSObject();
            out.put("kind", "share");
            out.put("title", title == null ? "" : title);
            out.put("text", text == null ? "" : text);
            out.put("images", images);
            getActivity().runOnUiThread(() -> notifyListeners("adminIntent", out, true));
        }).start();
    }

    @SuppressWarnings("deprecation")
    private List<Uri> streams(Intent intent) {
        List<Uri> out = new ArrayList<>();
        if (Intent.ACTION_SEND_MULTIPLE.equals(intent.getAction())) {
            ArrayList<Uri> list;
            if (Build.VERSION.SDK_INT >= 33) list = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM, Uri.class);
            else list = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
            if (list != null) out.addAll(list);
        } else {
            Uri one;
            if (Build.VERSION.SDK_INT >= 33) one = intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri.class);
            else one = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            if (one != null) out.add(one);
        }
        return out;
    }

    private byte[] readBytes(Uri uri) throws Exception {
        try (InputStream in = getContext().getContentResolver().openInputStream(uri)) {
            if (in == null) return null;
            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            byte[] chunk = new byte[64 * 1024];
            int read;
            while ((read = in.read(chunk)) != -1) {
                buffer.write(chunk, 0, read);
                if (buffer.size() > MAX_IMAGE_BYTES) return null; // too large to send across
            }
            return buffer.toByteArray();
        }
    }

    private String displayName(Uri uri, int n) {
        try (Cursor c = getContext().getContentResolver().query(uri, new String[] { OpenableColumns.DISPLAY_NAME }, null, null, null)) {
            if (c != null && c.moveToFirst()) {
                String name = c.getString(0);
                if (name != null && !name.isEmpty()) return name;
            }
        } catch (Exception ignored) {
            // fall through to a plain name
        }
        return "shared-" + n + ".jpg";
    }
}
