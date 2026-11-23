package co.krr.intranet.people;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class PersonNameFormatter {
    private static final Pattern TITLE_PREFIX = Pattern.compile(
            "^((?:AVP\\s*-\\s*)?(?:Mr\\.|Mrs\\.|Ms\\.|Dr\\.|Prof\\.)\\s*)(.+)$",
            Pattern.CASE_INSENSITIVE);

    private PersonNameFormatter() {
    }

    public static String format(String value) {
        if (value == null) {
            return value;
        }

        String normalized = value.trim().replaceAll("\\s+", " ");
        if (normalized.isEmpty()) {
            return normalized;
        }
        Matcher titleMatcher = TITLE_PREFIX.matcher(normalized);
        String prefix = "";
        String name = normalized;
        if (titleMatcher.matches()) {
            prefix = titleMatcher.group(1);
            name = titleMatcher.group(2);
        }

        String[] parts = name.split(" ");
        int firstNamePart = 0;
        int endNamePart = parts.length;
        List<String> initials = new ArrayList<>();

        while (firstNamePart < endNamePart - 1 && isInitial(parts[firstNamePart])) {
            initials.add(formatInitial(parts[firstNamePart]));
            firstNamePart++;
        }

        List<String> trailingInitials = new ArrayList<>();
        while (endNamePart - 1 > firstNamePart && isInitial(parts[endNamePart - 1])) {
            trailingInitials.add(0, formatInitial(parts[--endNamePart]));
        }
        initials.addAll(trailingInitials);

        if (initials.isEmpty()) {
            return prefix + name;
        }

        String remainingName = String.join(
                " ",
                List.of(parts).subList(firstNamePart, endNamePart));
        if (remainingName.isBlank()) {
            return prefix + name;
        }

        return prefix + String.join(". ", initials) + ". " + remainingName;
    }

    private static boolean isInitial(String part) {
        return part.matches("(?i)[a-z]\\.?")
                || part.matches("(?i)[a-z]\\.(?:[a-z]\\.?)+");
    }

    private static String formatInitial(String part) {
        String letters = part.replace(".", "").toUpperCase(Locale.ROOT);
        List<String> formatted = new ArrayList<>(letters.length());
        for (char letter : letters.toCharArray()) {
            formatted.add(String.valueOf(letter));
        }
        return String.join(". ", formatted);
    }
}
