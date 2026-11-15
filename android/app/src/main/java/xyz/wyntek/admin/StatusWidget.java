package xyz.wyntek.admin;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.widget.RemoteViews;

/**
 * Home-screen widget: how many of your sites are up, how many subscribers you have, and whether
 * an emailed post is stuck. It shows what the last alerts check saw (every 15 minutes), so it
 * needs phone alerts turned on; tapping it opens Site health in the admin.
 */
public class StatusWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context c, AppWidgetManager manager, int[] ids) {
        for (int id : ids) manager.updateAppWidget(id, build(c));
    }

    /** Redraws every copy of the widget from what the last check saw. */
    static void refresh(Context c) {
        try {
            AppWidgetManager manager = AppWidgetManager.getInstance(c);
            int[] ids = manager.getAppWidgetIds(new ComponentName(c, StatusWidget.class));
            for (int id : ids) manager.updateAppWidget(id, build(c));
        } catch (Exception ignored) {
            // a widget that cannot be redrawn now is redrawn at the next check
        }
    }

    static RemoteViews build(Context c) {
        SharedPreferences p = Alerts.prefs(c);
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_status);
        long last = p.getLong("lastCheck", 0);
        int total = p.getInt("wTotal", -1);
        int up = p.getInt("wUp", 0);
        int subs = p.getInt("wSubs", -1);
        int stuck = p.getInt("wStuck", 0);

        if (!Alerts.isOn(c) || last == 0 || total < 0) {
            v.setTextViewText(R.id.w_headline, "Turn on phone alerts");
            v.setTextColor(R.id.w_headline, Color.parseColor("#E8ECF8"));
            v.setTextViewText(R.id.w_detail, "Overview, Phone alerts keeps this up to date.");
            v.setTextViewText(R.id.w_time, "");
        } else {
            int down = total - up;
            v.setTextViewText(R.id.w_headline, down == 0 ? up + " of " + total + " sites up" : down + (down == 1 ? " site is" : " sites are") + " down");
            v.setTextColor(R.id.w_headline, Color.parseColor(down == 0 ? "#5BD68C" : "#FF7A7A"));
            StringBuilder detail = new StringBuilder();
            if (subs >= 0) detail.append(subs).append(subs == 1 ? " subscriber" : " subscribers");
            if (stuck > 0) {
                if (detail.length() > 0) detail.append(" \u00B7 ");
                detail.append(stuck).append(stuck == 1 ? " email needs a retry" : " emails need a retry");
            }
            v.setTextViewText(R.id.w_detail, detail.length() == 0 ? "Sites checked by Pulse" : detail.toString());
            v.setTextColor(R.id.w_detail, Color.parseColor(stuck > 0 ? "#FFC46B" : "#9AA5C0"));
            long mins = Math.max(0, (System.currentTimeMillis() - last) / 60000);
            v.setTextViewText(R.id.w_time, mins < 1 ? "Checked just now" : mins < 60 ? "Checked " + mins + " min ago" : "Checked " + (mins / 60) + " h ago");
        }

        Intent open = new Intent(Intent.ACTION_VIEW, Uri.parse(Alerts.link(c, "?focus=health#overview"))).setClass(c, MainActivity.class);
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        v.setOnClickPendingIntent(R.id.w_root, PendingIntent.getActivity(c, 7000, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
        return v;
    }
}
