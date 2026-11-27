package co.krr.intranet.content;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

public final class ThirukkuralCalendar {
    private static final int TOTAL_KURALS = 10;

    private ThirukkuralCalendar() {}

    public static int kuralNumber(LocalDate startDate, LocalDate serverDate) {
        long daysSinceStart = ChronoUnit.DAYS.between(startDate, serverDate);
        return (int) Math.floorMod(daysSinceStart, TOTAL_KURALS) + 1;
    }
}
