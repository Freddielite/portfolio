package xyz.wyntek.admin;

import android.content.Context;
import android.content.SharedPreferences;
import android.text.TextUtils;
import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * One alert check: asks /api/admin/alerts what is going on, compares it with
 * the last check and shows a notification for each change you asked about:
 *   - a site goes down, or comes back up (from Pulse)
 *   - new subscribers (from Wynmail)
 *   - the live site was rebuilt from a new commit
 * What was seen is always saved, also for changes you turned off, so turning
 * one on later never announces old news. If Pulse or Wynmail did not answer,
 * that part is skipped and checked again next time.
 */
public class AlertWorker extends Worker {

    public AlertWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context c = getApplicationContext();
        SharedPreferences p = Alerts.prefs(c);
        String base = p.getString("base", null);
        String id = p.getString("id", null);
        String token = p.getString("token", null);
        if (base == null || id == null || token == null) return Result.success();

        HttpURLConnection http = null;
        try {
            http = (HttpURLConnection) new URL(base + "/api/admin/alerts").openConnection();
            http.setRequestProperty("Authorization", "Bearer " + id + "." + token);
            http.setRequestProperty("Accept", "application/json");
            http.setConnectTimeout(15000);
            http.setReadTimeout(45000); // the site may be waiting on a sleeping Pulse or Wynmail
            int code = http.getResponseCode();
            if (code == 401) {
                // Turned off from the admin (or on another device): stop checking.
                Alerts.disable(c);
                Alerts.notify(c, Alerts.CH_DEPLOYS, Alerts.ID_OFF, "Phone alerts are off",
                    "This phone no longer gets alerts. Turn them on again in Overview, Phone alerts.", null, Alerts.link(c, "#overview"));
                return Result.success();
            }
            if (code != 200) {
                p.edit().putLong("lastTry", System.currentTimeMillis()).putString("lastError", "The site answered " + code + ".").apply();
                return Result.success();
            }
            JSONObject json = new JSONObject(read(http.getInputStream()));
            compare(c, p, json);
            return Result.success();
        } catch (Exception e) {
            p.edit().putLong("lastTry", System.currentTimeMillis()).putString("lastError", "Could not reach the site.").apply();
            return Result.success(); // the next regular check tries again
        } finally {
            if (http != null) http.disconnect();
        }
    }

    private void compare(Context c, SharedPreferences p, JSONObject json) throws Exception {
        boolean first = !p.getBoolean("seeded", false);
        SharedPreferences.Editor e = p.edit();
        List<String> notes = new ArrayList<>();

        // ---- Site health
        JSONArray monitors = json.optJSONArray("monitors");
        if (monitors != null) {
            JSONObject before = new JSONObject(p.getString("monitors", "{}"));
            JSONObject now = new JSONObject();
            for (int i = 0; i < monitors.length(); i++) {
                JSONObject m = monitors.getJSONObject(i);
                String mid = m.optString("id");
                String name = m.optString("name", "A site");
                String status = m.optString("status", "unknown");
                now.put(mid, status);
                String was = before.optString(mid, null);
                if (first || was == null || !p.getBoolean("health", true)) continue;
                boolean wasDown = "down".equals(was);
                boolean isDown = "down".equals(status);
                int nid = 1000 + (mid.hashCode() & 0x3ff);
                if (!wasDown && isDown) {
                    Alerts.notify(c, Alerts.CH_HEALTH, nid, name + " is down", "Pulse reports it as down. Tap to see site health.", null, Alerts.link(c, "?focus=health#overview"));
                } else if (wasDown && !isDown) {
                    Alerts.notify(c, Alerts.CH_HEALTH, nid, name + " is back up", "Pulse reports it as " + status + " again.", null, Alerts.link(c, "?focus=health#overview"));
                }
            }
            e.putString("monitors", now.toString());
        } else if (json.has("pulseReason") && !"not-set-up".equals(json.optString("pulseReason"))) {
            notes.add("Pulse did not answer");
        }

        // ---- New subscribers
        JSONArray signups = json.optJSONArray("signups");
        if (signups != null) {
            String last = p.getString("lastSignupAt", "");
            String newest = last;
            List<String> fresh = new ArrayList<>();
            for (int i = 0; i < signups.length(); i++) {
                JSONObject s = signups.getJSONObject(i);
                String at = s.optString("at", "");
                if (at.compareTo(newest) > 0) newest = at;
                if (at.compareTo(last) > 0 && "subscribed".equals(s.optString("status", "subscribed"))) {
                    String name = s.optString("name", "");
                    fresh.add(name.isEmpty() ? s.optString("email") : name + " (" + s.optString("email") + ")");
                }
            }
            // The first answer from Wynmail only notes who is there already.
            boolean seen = p.getBoolean("signupsSeeded", false);
            if (seen && !fresh.isEmpty() && p.getBoolean("subscribers", true)) {
                if (fresh.size() == 1) {
                    Alerts.notify(c, Alerts.CH_SUBSCRIBERS, Alerts.ID_SUBSCRIBERS, "New subscriber", fresh.get(0), null, Alerts.link(c, "#subscribers"));
                } else {
                    Alerts.notify(c, Alerts.CH_SUBSCRIBERS, Alerts.ID_SUBSCRIBERS, fresh.size() + " new subscribers", TextUtils.join(", ", fresh), fresh, Alerts.link(c, "#subscribers"));
                }
            }
            e.putString("lastSignupAt", newest).putBoolean("signupsSeeded", true);
        } else if (json.has("wynmailReason") && !"not-set-up".equals(json.optString("wynmailReason"))) {
            notes.add("Wynmail did not answer");
        }

        // ---- Site rebuilt
        JSONObject build = json.optJSONObject("build");
        String commit = build == null ? null : build.optString("commit", null);
        if (commit != null && !commit.isEmpty() && !"null".equals(commit)) {
            String was = p.getString("commit", null);
            if (!first && was != null && !was.equals(commit) && p.getBoolean("deploys", true)) {
                String message = build.optString("message", "");
                String text = message.isEmpty() || "null".equals(message) ? "Your latest changes are live." : "Live now: " + describe(message);
                Alerts.notify(c, Alerts.CH_DEPLOYS, Alerts.ID_DEPLOY, "Site finished rebuilding", text, null, Alerts.link(c, "#overview"));
            }
            e.putString("commit", commit);
        }

        long now = System.currentTimeMillis();
        e.putBoolean("seeded", true)
            .putLong("lastCheck", now)
            .putLong("lastTry", now)
            .putString("lastError", notes.isEmpty() ? null : TextUtils.join(", ", notes) + ", checked again next time.")
            .apply();
    }

    // "admin: update posts" -> "Blog posts saved", like Recent activity on the Overview.
    static String describe(String msg) {
        if (msg.startsWith("admin: update ")) {
            String type = msg.substring("admin: update ".length()).trim();
            switch (type) {
                case "posts": return "Blog posts saved";
                case "drafts": return "Draft posts saved";
                case "projects": return "Projects saved";
                case "skills": return "Skills saved";
                case "testimonials": return "Testimonials saved";
                case "siteSettings": return "Site settings saved";
                default: return type + " saved";
            }
        }
        if (msg.startsWith("admin: upload image")) return "Image uploaded";
        if (msg.startsWith("admin: ")) return msg.substring(7);
        return msg;
    }

    private static String read(InputStream in) throws Exception {
        try (InputStream s = in) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[16 * 1024];
            int n;
            while ((n = s.read(buf)) != -1) {
                out.write(buf, 0, n);
                if (out.size() > 512 * 1024) break; // far more than an answer ever needs
            }
            return out.toString(StandardCharsets.UTF_8.name());
        }
    }
}
