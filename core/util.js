module.exports = {
    // Exact for 2026, approximate (no holidays) for other years.
    countTradingDays: function(sinceMs, toMs) {
        const HOLIDAYS_2026 = new Set([
            '2026-01-01', // New Year's Day
            '2026-01-19', // MLK Day
            '2026-02-16', // Presidents' Day
            '2026-04-03', // Good Friday
            '2026-05-25', // Memorial Day
            '2026-06-19', // Juneteenth
            '2026-07-03', // Independence Day (observed, Jul 4 is Saturday)
            '2026-09-07', // Labor Day
            '2026-11-26', // Thanksgiving
            '2026-12-25', // Christmas
        ]);

        function toKey(d) {
            return d.getFullYear() + '-'
                + String(d.getMonth() + 1).padStart(2, '0') + '-'
                + String(d.getDate()).padStart(2, '0');
        }

        let count = 0;
        const current = new Date(sinceMs);
        current.setHours(12, 0, 0, 0);
        const end = new Date(toMs);
        end.setHours(12, 0, 0, 0);
        while (current <= end) {
            const dow = current.getDay();
            if (dow !== 0 && dow !== 6 && !HOLIDAYS_2026.has(toKey(current))) {
                count++;
            }
            current.setDate(current.getDate() + 1);
        }
        return count;
    },
    die: function(m){
        console.error(m);
        process.exit(0);
    }
};