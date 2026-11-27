package co.krr.intranet.content;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ThirukkuralTextParserTest {
    @Test
    void splitsTenNumberedTwoLineEntriesAndRemovesOnlyTheirNumberMarkers() {
        StringBuilder body = new StringBuilder();
        for (int number = 1; number <= 10; number++) {
            body.append(number).append(". first line ").append(number)
                    .append("\r\nsecond line ").append(number).append("\r\n\r\n");
        }

        var parsed = ThirukkuralTextParser.parseTen(body.toString());

        assertEquals(10, parsed.size());
        assertEquals(1, parsed.get(0).kuralNumber());
        assertEquals("first line 1", parsed.get(0).line1());
        assertEquals("second line 1", parsed.get(0).line2());
        assertEquals(10, parsed.get(9).kuralNumber());
    }

    @Test
    void refusesMissingOrOutOfOrderNumberedEntries() {
        assertTrue(ThirukkuralTextParser.parseTen("1. first\nsecond").isEmpty());
    }
}
