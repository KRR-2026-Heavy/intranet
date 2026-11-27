package co.krr.intranet.content;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ThirukkuralCalendarTest {
    @Test
    void selectsFirstKuralOnStartDateAndSecondWhenStartDateIsYesterday() {
        LocalDate today = LocalDate.of(2026, 11, 26);
        assertEquals(1, ThirukkuralCalendar.kuralNumber(today, today));
        assertEquals(2, ThirukkuralCalendar.kuralNumber(today.minusDays(1), today));
    }

    @Test
    void wrapsToFirstKuralOnTheEleventhDay() {
        LocalDate start = LocalDate.of(2026, 11, 26);
        assertEquals(1, ThirukkuralCalendar.kuralNumber(start, start.plusDays(10)));
    }
}
