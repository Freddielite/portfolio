package xyz.wyntek.admin;

import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.OpenableColumns;
import android.util.Base64;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

/**
 * Hands the web admin what the phone asked the app to do:
 *  - a long-press shortcut on the app icon (New post, Subscribers, Site health), and
 *  - something shared to the app from another app (text, a link or photos).
 *
 * Both arrive as one "adminIntent" event. The event is kept until the web page is
 * ready to listen (retainUntilConsumed), so it also works when the share or the
 * shortcut is what starts the app.
 */
@CapacitorPlugin(name = "AdminBridge")
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
        }
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
