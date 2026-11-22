package xyz.wyntek.admin;

/**
 * Decides what to tell you about one repo from the last state the phone saw and the
 * state the site reports now. Pure logic with no Android classes, so it is easy to test.
 *
 * What the phone remembers per repo is "failing:<commit>" or "passing:<commit>".
 *   - failing on a commit it has not told you about  -> FAILED (a new failure, or still failing after a new push)
 *   - passing now, and it was failing                -> FIXED
 *   - anything else (still the same failure, still passing, passing after passing) -> nothing
 */
final class RunAlerts {

    static final String FAILED = "failed";
    static final String FIXED = "fixed";

    private RunAlerts() {}

    static String key(String state, String sha) {
        return state + ":" + sha;
    }

    /** `was` is what the phone stored last time (null if it never saw the repo). Returns FAILED, FIXED or null. */
    static String decide(String was, String state, String sha) {
        if ("failing".equals(state)) return key(state, sha).equals(was) ? null : FAILED;
        if ("passing".equals(state) && was != null && was.startsWith("failing:")) return FIXED;
        return null;
    }

    /** "me/site" -> "site". */
    static String shortName(String repo) {
        int i = repo.indexOf('/');
        return i >= 0 && i < repo.length() - 1 ? repo.substring(i + 1) : repo;
    }
}
