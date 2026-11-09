package xyz.wyntek.admin;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import androidx.annotation.RequiresApi;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.ExistingWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Phone alerts, the free way: no Firebase and no push server. Every 15 minutes
 * (Android's shortest repeat, and it may wait longer while the phone is idle)
 * AlertWorker asks the site what changed and shows a normal notification.
 *
 * Everything the check needs lives in this app's private settings: the site's
 * address, this phone's alert token (it can only read the alert status) and
 * what was seen last time, so only changes are announced.
 */
final class Alerts {

    static final String PREFS = "admin_alerts";
    static final String WORK = "admin-alerts";
    static final String WORK_NOW = "admin-alerts-now";

    static final String CH_HEALTH = "health";
    static final String CH_SUBSCRIBERS = "subscribers";
    static final String CH_DEPLOYS = "deploys";

    static final int ID_SUBSCRIBERS = 2000;
    static final int ID_DEPLOY = 3000;
    static final int ID_TEST = 4000;
    static final int ID_OFF = 4001;

    private Alerts() {}

    static SharedPreferences prefs(Context c) {
        return c.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static boolean isOn(Context c) {
        SharedPreferences p = prefs(c);
        return p.getString("token", null) != null && p.getString("id", null) != null;
    }

    /** Turns alerts on. The first check only notes how things are, so nothing old is announced. */
    static void enable(Context c, String base, String id, String token, boolean health, boolean subscribers, boolean deploys) {
        prefs(c).edit()
            .clear()
            .putString("base", base)
            .putString("id", id)
            .putString("token", token)
            .putBoolean("health", health)
            .putBoolean("subscribers", subscribers)
            .putBoolean("deploys", deploys)
            .apply();
        createChannels(c);
        schedule(c);
        checkNow(c);
    }

    static void setKinds(Context c, Boolean health, Boolean subscribers, Boolean deploys) {
        SharedPreferences.Editor e = prefs(c).edit();
        if (health != null) e.putBoolean("health", health);
        if (subscribers != null) e.putBoolean("subscribers", subscribers);
        if (deploys != null) e.putBoolean("deploys", deploys);
        e.apply();
    }

    /** Turns alerts off on this phone and returns its id, so the admin can forget it on the server too. */
    static String disable(Context c) {
        String id = prefs(c).getString("id", null);
        WorkManager wm = WorkManager.getInstance(c);
        wm.cancelUniqueWork(WORK);
        wm.cancelUniqueWork(WORK_NOW);
        prefs(c).edit().clear().apply();
        return id;
    }

    static void schedule(Context c) {
        Constraints online = new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
        PeriodicWorkRequest every = new PeriodicWorkRequest.Builder(AlertWorker.class, 15, TimeUnit.MINUTES)
            .setConstraints(online)
            .build();
        WorkManager.getInstance(c).enqueueUniquePeriodicWork(WORK, ExistingPeriodicWorkPolicy.UPDATE, every);
    }

    static void checkNow(Context c) {
        Constraints online = new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
        OneTimeWorkRequest once = new OneTimeWorkRequest.Builder(AlertWorker.class).setConstraints(online).build();
        WorkManager.getInstance(c).enqueueUniqueWork(WORK_NOW, ExistingWorkPolicy.REPLACE, once);
    }

    static void createChannels(Context c) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm == null) return;
        nm.createNotificationChannel(channel(c, CH_HEALTH, R.string.channel_health, R.string.channel_health_desc, NotificationManager.IMPORTANCE_HIGH));
        nm.createNotificationChannel(channel(c, CH_SUBSCRIBERS, R.string.channel_subscribers, R.string.channel_subscribers_desc, NotificationManager.IMPORTANCE_DEFAULT));
        nm.createNotificationChannel(channel(c, CH_DEPLOYS, R.string.channel_deploys, R.string.channel_deploys_desc, NotificationManager.IMPORTANCE_LOW));
    }

    @RequiresApi(26)
    private static NotificationChannel channel(Context c, String id, int name, int desc, int importance) {
        NotificationChannel ch = new NotificationChannel(id, c.getString(name), importance);
        ch.setDescription(c.getString(desc));
        return ch;
    }

    static boolean allowed(Context c) {
        return NotificationManagerCompat.from(c).areNotificationsEnabled();
    }

    /** Shows one notification. Tapping it opens the admin at `link` (handled like any admin link). */
    static void notify(Context c, String channel, int id, String title, String text, List<String> lines, String link) {
        if (!allowed(c)) return;
        createChannels(c);
        Intent open = new Intent(Intent.ACTION_VIEW, Uri.parse(link)).setClass(c, MainActivity.class);
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent tap = PendingIntent.getActivity(c, id, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

        NotificationCompat.Builder b = new NotificationCompat.Builder(c, channel)
            .setSmallIcon(R.drawable.ic_stat_alert)
            .setContentTitle(title)
            .setContentText(text)
            .setContentIntent(tap)
            .setAutoCancel(true)
            .setPriority(CH_HEALTH.equals(channel) ? NotificationCompat.PRIORITY_HIGH : NotificationCompat.PRIORITY_DEFAULT);
        if (lines != null && lines.size() > 1) {
            NotificationCompat.InboxStyle inbox = new NotificationCompat.InboxStyle();
            for (String l : lines) inbox.addLine(l);
            b.setStyle(inbox);
        } else {
            b.setStyle(new NotificationCompat.BigTextStyle().bigText(text));
        }
        try {
            NotificationManagerCompat.from(c).notify(id, b.build());
        } catch (SecurityException ignored) {
            // notifications were switched off between the check and now
        }
    }

    static String link(Context c, String where) {
        String base = prefs(c).getString("base", "https://portfolio.wyntek.xyz");
        return base + "/admin" + where;
    }
}
