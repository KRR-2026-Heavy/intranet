package co.krr.intranet.content;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Parses the older published format: each numbered first line followed by its second line. */
public final class ThirukkuralTextParser {
    private static final Pattern NUMBERED_LINE = Pattern.compile("^\\s*(\\d{1,2})\\s*[.)\\-:]\\s*(.*)$");

    private ThirukkuralTextParser() {}

    public static List<ThirukkuralCollectionService.KuralText> parseTen(String body) {
        if (body == null || body.isBlank()) return List.of();
        String[] lines = body.split("\\R", -1);
        List<ThirukkuralCollectionService.KuralText> result = new ArrayList<>(10);
        int cursor = 0;
        while (cursor < lines.length) {
            while (cursor < lines.length && lines[cursor].isBlank()) cursor++;
            if (cursor == lines.length) break;

            Matcher marker = NUMBERED_LINE.matcher(lines[cursor]);
            if (!marker.matches() || Integer.parseInt(marker.group(1)) != result.size() + 1) return List.of();
            String firstLine = marker.group(2).strip();
            cursor++;
            if (firstLine.isEmpty()) {
                while (cursor < lines.length && lines[cursor].isBlank()) cursor++;
                if (cursor == lines.length) return List.of();
                firstLine = lines[cursor++].strip();
            }
            while (cursor < lines.length && lines[cursor].isBlank()) cursor++;
            if (cursor == lines.length) return List.of();
            String secondLine = lines[cursor++].strip();
            if (firstLine.isEmpty() || secondLine.isEmpty()
                    || NUMBERED_LINE.matcher(secondLine).matches()) return List.of();
            result.add(new ThirukkuralCollectionService.KuralText(result.size() + 1, firstLine, secondLine));
        }
        return result.size() == 10 ? List.copyOf(result) : List.of();
    }
}
