"""Rendered synthetic user flow. Browser plugin not available; use regular Playwright."""
import json
import os
import subprocess
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
evidence = Path(os.environ.get("QA_OUTPUT", str(Path(tempfile.gettempdir()) / "book-review-qa")))
evidence.mkdir(parents=True, exist_ok=True)
server = subprocess.Popen(["node", str(ROOT / "tests/start-ui-server.js")],
                          cwd=ROOT, env=os.environ.copy(), text=True,
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE)
try:
    line = server.stdout.readline()
    if not line:
        raise RuntimeError("UI server did not start: " + server.stderr.read())
    url = json.loads(line)["url"]
    errors = []
    dialogs = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel="chrome", headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 1000})
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)
        page.on("dialog", lambda dialog: (dialogs.append(dialog.type), dialog.accept()))
        page.goto(url)
        expect(page).to_have_title("Book Review Platform")
        assert page.url.startswith(url)
        expect(page.locator("#auth-section")).to_be_visible()
        expect(page.locator("h1")).to_have_text("Book Review Platform")
        assert len(page.locator("body").inner_text()) > 100
        assert not page.locator("vite-error-overlay, nextjs-portal").count()
        page.locator("#reg-username").fill("<b>DemoReader</b>")
        page.locator("#reg-email").fill("browser@example.test")
        page.locator("#reg-password").fill("synthetic-browser-password")
        page.locator("#register-form button").click()
        expect(page.locator("#register-message")).to_contain_text("Account created")
        page.locator("#login-email").fill("browser@example.test")
        page.locator("#login-password").fill("synthetic-browser-password")
        page.locator("#login-form button").click()
        expect(page.locator("#dashboard-section")).to_be_visible()
        expect(page.locator("#profile-display")).to_contain_text("<b>DemoReader</b>")
        assert page.locator("#profile-display b").count() == 0
        fixture = [{"externalId": "/works/OL_SYNTHETIC", "title": 'Synthetic Book "A" <safe>',
                    "authors": ["Fictional O'Author"], "publishedDate": "2025", "thumbnail": None}]
        page.route("**/api/books/search?*", lambda route: route.fulfill(json=fixture))
        page.locator("#search-query").fill("Synthetic Book")
        page.locator("#search-form button").click()
        expect(page.locator("#search-results h3")).to_have_text(fixture[0]["title"])
        page.locator("#search-results button").click()
        expect(page.locator("#my-books h3")).to_have_text(fixture[0]["title"])
        page.locator("#my-books").get_by_role("button", name="Review", exact=True).click()
        expect(page.locator("#review-modal")).to_be_visible()
        page.locator("#review-rating").select_option("4")
        unsafe_text = "<img src=x onerror=alert(1)> Synthetic review"
        page.locator("#review-text").fill(unsafe_text)
        page.locator("#review-form button").click()
        expect(page.locator("#my-reviews .review-text")).to_have_text(unsafe_text)
        assert page.locator("#my-reviews img").count() == 0
        page.locator("#my-reviews").get_by_role("button", name="Edit", exact=True).click()
        expect(page.locator("#modal-title")).to_have_text("Edit Review")
        expect(page.locator("#review-text")).to_have_value(unsafe_text)
        page.locator("#review-rating").select_option("5")
        page.locator("#review-text").fill("Updated synthetic review. No real people or books.")
        page.locator("#review-form button").click()
        expect(page.locator("#my-reviews .review-text")).to_have_text(
            "Updated synthetic review. No real people or books.")
        expect(page.locator("#my-reviews")).to_contain_text("(5/5)")
        assert page.locator("#my-reviews .review-card").count() == 1
        page.screenshot(path=str(evidence / "desktop.png"), full_page=True)
        page.set_viewport_size({"width": 390, "height": 844})
        page.evaluate("window.scrollTo(0,0)")
        assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
        page.screenshot(path=str(evidence / "mobile.png"), full_page=True)
        page.locator("#my-books").get_by_role("button", name="Delete", exact=True).click()
        expect(page.locator("#my-books")).to_contain_text("No saved books")
        expect(page.locator("#my-reviews")).to_contain_text("No reviews")
        page.get_by_role("button", name="Logout", exact=True).click()
        expect(page.locator("#auth-section")).to_be_visible()
        assert page.locator("#my-reviews").inner_text() == ""
        assert page.locator("#profile-display").inner_text() == ""
        assert dialogs == ["confirm"], dialogs
        assert errors == [], errors
        result = {"passed": True, "browser": "Chrome (Chromium)", "viewports": ["1440x1000", "390x844"],
                  "flow": "register, login, search fixture, save, create/edit review, cascade delete, logout",
                  "literal_html_checks": True, "console_errors": errors,
                  "screenshots": ["desktop.png", "mobile.png"]}
        (evidence / "checks.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
        print(json.dumps(result))
        browser.close()
finally:
    server.terminate()
    try:
        server.wait(timeout=15)
    except subprocess.TimeoutExpired:
        server.kill()
