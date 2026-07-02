from playwright.sync_api import sync_playwright
import os

html_path = r"C:\Users\ggh\WorkBuddy\2026-06-29-02-46-29\auto-chess-game\star-ocean-wechat-poster.html"
out_path = r"C:\Users\ggh\Desktop\star-ocean-wechat-poster.jpg"

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 750, "height": 900})
    page.goto("file:///" + html_path.replace("\\", "/"))
    page.wait_for_load_state("networkidle")

    # 获取实际内容高度
    full_height = page.evaluate("document.body.scrollHeight")
    print(f"Content height: {full_height}px")

    # 设置viewport为完整高度，截取全页
    page.set_viewport_size({"width": 750, "height": full_height})
    page.screenshot(path=out_path, full_page=True, type="jpeg", quality=92)
    browser.close()

print(f"Saved: {out_path}")
file_size = os.path.getsize(out_path)
print(f"File size: {file_size / 1024:.1f} KB")
