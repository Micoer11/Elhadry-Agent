<p align="center">
  <a href="https://elhadry.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="شعار Elhadry Agent">
    </picture>
  </a>
</p>
<p align="center">وكيل برمجة بالذكاء الاصطناعي مفتوح المصدر.</p>
<p align="center">
  <a href="https://www.npmjs.com/package/@elhadry/cli"><img alt="npm" src="https://img.shields.io/npm/v/@elhadry/cli?style=flat-square" /></a>
</p>

<p align="center">
  <a href="README.md">English</a> |
  <a href="README.ar.md">العربية</a>
</p>

[![Elhadry Agent Terminal UI](packages/web/src/assets/lander/screenshot.png)](https://elhadry.ai)

---

### التثبيت

```bash
# YOLO
curl -fsSL https://elhadry.ai/v2/install | bash

# مديري الحزم
npm i -g @elhadry/cli@latest      # او bun/pnpm/yarn
```

> [!TIP]
> احذف الاصدارات الاقدم من 0.1.x قبل التثبيت.

### تطبيق سطح المكتب (BETA)

يتوفر Elhadry Agent ايضا كتطبيق سطح مكتب. قم بالتنزيل من [elhadry.ai/download](https://elhadry.ai/download).

| المنصة                | التنزيل                            |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `elhadry-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `elhadry-desktop-mac-x64.dmg`     |
| Windows               | `elhadry-desktop-win-x64.exe`     |
| Linux                 | `.deb` او `.rpm` او AppImage       |

```bash
```

#### مجلد التثبيت

يثبت سكربت التثبيت Elhadry Agent في `$HOME/.elhadry/bin`.

### Agents

يتضمن Elhadry Agent وكيليْن (Agents) مدمجين يمكنك التبديل بينهما باستخدام زر `Tab`.

- **build** - الافتراضي، وكيل بصلاحيات كاملة لاعمال التطوير
- **plan** - وكيل للقراءة فقط للتحليل واستكشاف الكود
  - يرفض تعديل الملفات افتراضيا
  - يطلب الاذن قبل تشغيل اوامر bash
  - مثالي لاستكشاف قواعد كود غير مألوفة او لتخطيط التغييرات

بالاضافة الى ذلك يوجد وكيل فرعي **general** للبحث المعقد والمهام متعددة الخطوات.
يستخدم داخليا ويمكن استدعاؤه بكتابة `@general` في الرسائل.

تعرف على المزيد حول [agents](https://elhadry.ai/v2/docs/agents).

### التوثيق

لمزيد من المعلومات حول كيفية ضبط Elhadry Agent، [**راجع التوثيق**](https://elhadry.ai/v2/docs).

### المساهمة

اذا كنت مهتما بالمساهمة في Elhadry Agent، يرجى قراءة [contributing docs](./CONTRIBUTING.md) قبل ارسال pull request.

### البناء فوق Elhadry Agent

اذا كنت تعمل على مشروع مرتبط بـ Elhadry Agent ويستخدم "elhadry" كجزء من اسمه (مثل "elhadry-dashboard" او "elhadry-mobile")، يرجى اضافة ملاحظة في README توضح انه ليس مبنيا بواسطة فريق Elhadry Agent ولا يرتبط بنا بأي شكل.

---

**انضم الى مجتمعنا** [Discord](https://discord.gg/elhadry) | [X.com](https://x.com/elhadry)
