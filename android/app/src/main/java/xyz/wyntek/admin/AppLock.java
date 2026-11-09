package xyz.wyntek.admin;

import android.content.Context;
import android.content.SharedPreferences;

/**
 * The app lock's memory and its one decision: "must the fingerprint be asked
 * now?" It lives on the native side because Android always runs this code
 * when the app leaves and comes back, while the web page's own code may be
 * paused at exactly those moments (which made the lock hit and miss).
 *
 * The web admin tells it the settings (configure): whether fingerprint unlock
 * is set up on this phone, and "Lock the app" (right away, or after N minutes).
 * The decision is kept until the page confirms its lock screen is up
 * (pending), so a fresh page that loads in the meantime locks too.
 */
final class AppLock {

    private static final String PREFS = "admin_lock";

    private AppLock() {}

    private static SharedPreferences prefs(Context c) {
        return c.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static void configure(Context c, boolean enabled, long lockAfterMs, String background) {
        prefs(c).edit()
            .putBoolean("enabled", enabled)
            .putLong("lockAfterMs", Math.max(0, lockAfterMs))
            .putString("background", background)
            .apply();
        if (!enabled) setPending(c, false);
    }

    static boolean enabled(Context c) {
        return prefs(c).getBoolean("enabled", false);
    }

    static String background(Context c) {
        return prefs(c).getString("background", "#0b1020");
    }

    /** A short grace period: the file picker, the share sheet, the live site, Android settings. */
    static void quiet(Context c, long ms) {
        long until = System.currentTimeMillis() + Math.max(0, ms);
        SharedPreferences p = prefs(c);
        if (until > p.getLong("quietUntil", 0)) p.edit().putLong("quietUntil", until).apply();
    }

    static boolean isQuiet(Context c) {
        return System.currentTimeMillis() < prefs(c).getLong("quietUntil", 0);
    }

    /** The app went out of sight. Returns true if it should be covered meanwhile. */
    static boolean left(Context c) {
        prefs(c).edit().putLong("leftAt", System.currentTimeMillis()).apply();
        return enabled(c) && !isQuiet(c);
    }

    /**
     * The app is back (or starting fresh). Decides whether to lock, remembers the
     * answer until the page confirms, and uses up any grace period.
     */
    static boolean decide(Context c) {
        SharedPreferences p = prefs(c);
        boolean quiet = isQuiet(c);
        p.edit().putLong("quietUntil", 0).apply();
        if (!enabled(c)) return false;
        if (p.getBoolean("pending", false)) return true; // still waiting for the page from last time
        long leftAt = p.getLong("leftAt", 0);
        boolean lock = mustLock(System.currentTimeMillis(), leftAt, p.getLong("lockAfterMs", 0), quiet);
        if (lock) setPending(c, true);
        return lock;
    }

    // Kept apart so it can be tested on its own. "Right away" (0) locks after any
    // time away; no record of leaving (a first start) counts as long ago.
    static boolean mustLock(long now, long leftAt, long lockAfterMs, boolean quiet) {
        if (quiet) return false;
        if (leftAt <= 0) return true;
        return now - leftAt >= lockAfterMs;
    }

    static boolean pending(Context c) {
        return enabled(c) && prefs(c).getBoolean("pending", false);
    }

    static void setPending(Context c, boolean on) {
        prefs(c).edit().putBoolean("pending", on).apply();
    }
}
