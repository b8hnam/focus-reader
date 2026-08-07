# Contributing

[فارسی پایین‌تر](#مشارکت)

## Before anything else

This project is **not actively maintained**. It was written for its author's own use. Issues and pull requests are read, but nothing is promised: no response time, no fixes, no roadmap. If you need a maintained version, fork it — the GPL exists for exactly this.

That said, contributions are genuinely welcome, and a good pull request is the fastest path from "this is broken" to "this is fixed".

## Working on the code

There is no build step and no dependencies. Clone, edit, reload:

1. `git clone` the repository.
2. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and pick the `src` folder.
3. Change a file in `src/`.
4. Press the reload button on the extension card. For content-script changes, also reload the page you are testing on.

Where things live:

| File | What it does |
| --- | --- |
| `src/manifest.json` | Manifest V3 — permissions, shortcuts, entry points |
| `src/background.js` | Service worker: context menus, commands, translation and AI requests |
| `src/content.js` | Everything visible on the page: panel, windows, dock, tools |
| `src/palette.js` | Accent colour generation |
| `src/popup.*` | Settings page (also the options page) |
| `src/sidepanel.*` | Side-panel view |
| `src/_locales/` | `en` and `fa` strings |

## House rules

- **Plain JavaScript only.** No frameworks, no bundler, no build step, no dependencies. This is a hard constraint, not a preference.
- **Do not slow down page load.** The content script must stay inert until the user acts: no DOM, no storage reads, no fetches, no timers on load. Passive listeners only.
- **Every user-facing string goes through `_locales/`**, in both `en` and `fa`. No hard-coded text.
- **Right-to-left is not an afterthought.** Test anything that touches layout with Persian text as well as English.
- **No remote code, no analytics, no new endpoints.** Any network request the user did not explicitly configure will be rejected.
- **Keep the existing look.** The interface is deliberate; visual changes need a reason and a screenshot.
- Match the surrounding style: tabs or spaces, quotes, naming — copy whatever the file already does.

## Pull requests

- One change per pull request. A large unfocused pull request will most likely go unreviewed.
- Say what you tested, on which Chrome version and operating system, and with which languages.
- Add an entry under `## [Unreleased]` in `CHANGELOG.md`.
- Do not bump the version in `manifest.json` — releases are cut by the author.
- By contributing you agree your work is released under GPLv3-or-later, and that the name and logo stay outside the licence ([TRADEMARK.md](TRADEMARK.md)).

## Cutting a release (author)

1. Move the `## [Unreleased]` entries into a new version section in `CHANGELOG.md`, with the date.
2. Set the new `version` in `src/manifest.json`.
3. Commit, then `git tag v1.10.0 && git push origin v1.10.0`.
4. `.github/workflows/release.yml` checks that the tag matches the manifest, validates the extension, zips the contents of `src/` (with `LICENSE`, `TRADEMARK.md` and `PRIVACY.md` added), and publishes the release with the changelog section as its notes.

A version mismatch between tag and manifest fails the build on purpose. To retry: `git tag -d v1.10.0 && git push origin :v1.10.0`, fix, tag again.

---

<div dir="rtl">

## مشارکت

### پیش از هر چیز

این پروژه **فعالانه پشتیبانی نمی‌شود**. نویسنده‌اش آن را برای استفاده‌ی خودش نوشته است. مشکل‌ها و درخواست‌های ادغام خوانده می‌شوند، ولی هیچ قولی داده نمی‌شود: نه زمان پاسخ، نه رفع مشکل، نه نقشه‌ی راه. اگر به نسخه‌ی پشتیبانی‌شده نیاز دارید انشعاب بگیرید — پروانه دقیقاً برای همین است.

با این حال مشارکت واقعاً پذیرفته می‌شود، و یک درخواست ادغام خوب کوتاه‌ترین راه از «این خراب است» به «این درست شد» است.

### کار روی کد

مرحله‌ی ساخت و وابستگی وجود ندارد. کپی کنید، تغییر دهید، بازخوانی کنید:

۱. مخزن را با `git clone` بگیرید.
۲. به `chrome://extensions` بروید، **Developer mode** را روشن کنید، **Load unpacked** بزنید و پوشه‌ی `src` را انتخاب کنید.
۳. پرونده‌ای را در `src` تغییر دهید.
۴. دکمه‌ی بازخوانی را روی کارت افزونه بزنید. برای تغییرهای مربوط به اسکریپت محتوا، صفحه‌ی آزمایشی را هم بازخوانی کنید.

### قاعده‌های خانه

- **فقط جاوااسکریپت خالص.** بدون فریم‌ورک، بدون بسته‌ساز، بدون مرحله‌ی ساخت، بدون وابستگی. این یک محدودیت قطعی است، نه یک سلیقه.
- **بارگذاری صفحه را کند نکنید.** اسکریپت محتوا باید تا وقتی کاربر کاری نکرده بی‌کار بماند: هنگام بارگذاری نه عنصری ساخته شود، نه از حافظه خوانده شود، نه درخواستی برود، نه زمان‌سنجی اجرا شود. فقط شنونده‌ی غیرفعال.
- **هر متنی که کاربر می‌بیند از `_locales` بیاید**، هم `en` و هم `fa`. هیچ متن ثابتی در کد نوشته نشود.
- **راست‌چین حاشیه نیست.** هرچه به چیدمان مربوط است را با متن فارسی هم بیازمایید، نه فقط انگلیسی.
- **بدون کد از راه دور، بدون آمارگیری، بدون نقطه‌ی پایانی تازه.** هر درخواست شبکه‌ای که کاربر خودش تنظیمش نکرده باشد رد می‌شود.
- **ظاهر فعلی حفظ شود.** رابط با دقت طراحی شده؛ تغییر ظاهری به دلیل و تصویر نیاز دارد.
- سبک نوشتن کد را از پرونده‌ای که در آن کار می‌کنید تقلید کنید.

### درخواست ادغام

- هر درخواست، یک تغییر. درخواست بزرگ و پراکنده به احتمال زیاد بی‌بررسی می‌ماند.
- بنویسید چه چیزی را، با کدام نسخه‌ی کروم و کدام سیستم‌عامل و با کدام زبان‌ها آزموده‌اید.
- در `CHANGELOG.md` زیر بخش `## [Unreleased]` یک سطر اضافه کنید.
- شماره‌ی نسخه را در `manifest.json` تغییر ندهید — انتشار نسخه‌ها با نویسنده است.
- با مشارکت می‌پذیرید که کارتان زیر پروانه‌ی GPLv3 یا بالاتر منتشر شود و نام و لوگو بیرون از پروانه بماند ([TRADEMARK.md](TRADEMARK.md)).

### انتشار نسخه (برای نویسنده)

۱. سطرهای زیر `## [Unreleased]` را در `CHANGELOG.md` به بخش نسخه‌ی تازه با تاریخش منتقل کنید.
۲. مقدار `version` را در `src/manifest.json` به‌روز کنید.
۳. تغییرها را ثبت کنید، بعد `git tag v1.10.0 && git push origin v1.10.0`.
۴. جریان `.github/workflows/release.yml` بررسی می‌کند برچسب با مانیفست یکی باشد، افزونه را وارسی می‌کند، محتوای `src` را (به‌همراه `LICENSE` و `TRADEMARK.md` و `PRIVACY.md`) فشرده می‌کند و نسخه را با متن همان بخش تاریخچه منتشر می‌کند.

ناهماهنگی برچسب و مانیفست عمداً ساخت را ناموفق می‌کند. برای تلاش دوباره: `git tag -d v1.10.0 && git push origin :v1.10.0`، اصلاح کنید و دوباره برچسب بزنید.

</div>
