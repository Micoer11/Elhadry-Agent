<p align="center">
  <img src="packages/desktop/app-icon.png" width="112" alt="Elhadry Agent" />
</p>

<h1 align="center">Elhadry Agent</h1>

<p align="center">وكيل برمجة بالذكاء الاصطناعي يعمل على جهازك.</p>

<p align="center">
  <a href="README.md">English</a> |
  <a href="README.ar.md">العربية</a>
</p>

---

## التنزيل

كل إصدار يتم بناؤه تلقائياً على GitHub ونشره في
[صفحة الإصدارات](https://github.com/Micoer11/Elhadry-Agent/releases/latest).
لا تحتاج إلى بناء أي شيء على جهازك.

| الملف                          | الاسم                              |
| ------------------------------ | ---------------------------------- |
| مثبّت ويندوز                   | `elhadry-desktop-windows-x64.exe`  |
| نسخة محمولة بدون تثبيت         | `elhadry-desktop-windows-x64.zip`  |
| أداة سطر الأوامر (CLI)         | `elhadry-cli-windows-x64.exe`      |
| معلومات التحديث                | `version.json`                     |

هذه الروابط تشير دائماً إلى أحدث إصدار:

- المثبّت: `https://github.com/Micoer11/Elhadry-Agent/releases/latest/download/elhadry-desktop-windows-x64.exe`
- المحمول: `https://github.com/Micoer11/Elhadry-Agent/releases/latest/download/elhadry-desktop-windows-x64.zip`
- سطر الأوامر: `https://github.com/Micoer11/Elhadry-Agent/releases/latest/download/elhadry-cli-windows-x64.exe`

### أول تشغيل على ويندوز

النسخ غير موقّعة رقمياً، لذلك قد يظهر تحذير من Windows SmartScreen:

1. اضغط **More info** (مزيد من المعلومات).
2. اضغط **Run anyway** (تشغيل على أي حال).

النسخة المحمولة تحتاج فقط إلى فك الضغط ثم تشغيل `Elhadry Agent.exe`.

## أداة سطر الأوامر

افتح PowerShell ونزّل الأداة:

```powershell
curl.exe -L -o "$env:LOCALAPPDATA\elhadry.exe" https://github.com/Micoer11/Elhadry-Agent/releases/latest/download/elhadry-cli-windows-x64.exe
& "$env:LOCALAPPDATA\elhadry.exe" --version
```

ثم شغّلها داخل مجلد المشروع الذي تريد العمل عليه:

```powershell
cd C:\path\to\your\project
& "$env:LOCALAPPDATA\elhadry.exe"
```

## التحديثات

يتحقق التطبيق من ملف `version.json` في أحدث إصدار ويخبرك عند توفر نسخة جديدة.
للتحديث يدوياً، نزّل أحدث مثبّت من
[صفحة الإصدارات](https://github.com/Micoer11/Elhadry-Agent/releases/latest) وشغّله؛
إعداداتك ومحادثاتك تبقى كما هي.

كل إصدار يحتفظ بملفاته، لذلك يمكنك تنزيل أي إصدار أقدم وتثبيته في أي وقت.

## البناء من المصدر

البناء يتم على GitHub Actions (ملف `.github/workflows/build-release.yml`)
ثم يُنشر الناتج كإصدار. للبناء محلياً:

```bash
bun install
bun run --cwd packages/desktop dev
```

المستودع يحتوي على الكود المصدري فقط. لا يتم رفع `node_modules` ولا ملفات
البناء ولا الملفات التنفيذية أبداً.

## الترخيص

MIT. راجع ملف [LICENSE](./LICENSE).
