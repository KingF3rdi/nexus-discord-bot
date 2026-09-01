import assert from "node:assert/strict";
import { test } from "node:test";
import { formatMoney, parseDuration, payCommand, stars } from "./util.js";
test("formatiert Preise deutsch", () => {
    assert.equal(formatMoney(6_000_000), "$6.000.000");
    assert.equal(formatMoney(12300), "$12.300");
});
test("baut den /pay-Befehl mit Gesamtbetrag", () => {
    const qty = 3;
    const unit = 6_000_000;
    assert.equal(payCommand("FriendsWithMny", unit * qty), "/pay FriendsWithMny 18000000");
    assert.equal(payCommand("@Hugo", 500), "/pay Hugo 500");
});
test("parst Dauerangaben", () => {
    assert.equal(parseDuration("7h"), 7 * 3_600_000);
    assert.equal(parseDuration("30m"), 30 * 60_000);
    assert.equal(parseDuration("1d"), 86_400_000);
});
test("Sterne 1–5", () => {
    assert.equal(stars(5), "⭐⭐⭐⭐⭐  5/5");
    assert.equal(stars(3), "⭐⭐⭐☆☆  3/5");
});
