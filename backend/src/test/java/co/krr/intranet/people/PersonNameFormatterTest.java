package co.krr.intranet.people;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class PersonNameFormatterTest {
    @Test
    void formatsLeadingAndTrailingInitialsWithoutChangingTitlesOrNames() {
        assertEquals("R. Kumar", PersonNameFormatter.format("R Kumar"));
        assertEquals("A. B. Kumar", PersonNameFormatter.format("A B Kumar"));
        assertEquals("R. Kumar", PersonNameFormatter.format("Kumar R"));
        assertEquals("C. Sathishkumar", PersonNameFormatter.format("Sathishkumar C."));
        assertEquals("R. I. Vignesh Pandian", PersonNameFormatter.format("Vignesh Pandian R.I"));
        assertEquals("Dr. S. Karthikesan", PersonNameFormatter.format("Dr. S Karthikesan"));
        assertEquals("AVP - Mr. S. Karthikesan",
                PersonNameFormatter.format("AVP - Mr. S. Karthikesan"));
        assertEquals("Dinesh Kumar", PersonNameFormatter.format("Dinesh Kumar"));
        assertEquals("S. Selva Kantha", PersonNameFormatter.format("Selva Kantha S."));
    }

    @Test
    void handlesNullBlankAndRepeatedWhitespace() {
        assertEquals(null, PersonNameFormatter.format(null));
        assertEquals("", PersonNameFormatter.format("   "));
        assertEquals("S. Rajesh", PersonNameFormatter.format("  S   Rajesh "));
    }
}
