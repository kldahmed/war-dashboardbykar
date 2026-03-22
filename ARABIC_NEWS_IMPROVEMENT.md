# تحسين طبقة عرض الأخبار العربية

## المشكلة الأصلية
- عرض ترجمات حرفية سيئة وغير مفهومة
- HTML entities مثل `&#039;` و `&amp;` لم تُفك وتظهر مباشرة
- عناوين مشوّهة وغير صحفية
- نصوص مكسورة وممزوجة برموز غريبة
- بدون قواعس جودة قبل العرض

## الحل المطبق

### 1. Pipeline معالجة موحد للأخبار
تم إنشاء `newsProcessor` داخل `summaryLocalizer.js` يشمل:

#### أ) فك HTML Entities
```javascript
decodeHtmlEntities(text)
```
- يفك `&#039;` → `'`
- يفك `&amp;` → `&`
- يفك `&quot;` → `"`
- وجميع الـ entities الأخرى

#### ب) تنظيف النصوص (Sanitization)
```javascript
sanitizeText(text)
```
- إزالة HTML tags
- إزالة URLs وعناوين البريد
- إزالة الترقيم المفرط
- إزالة الأحرف الخاصة المضللة
- تنسيق المسافات البيضاء

#### ج) فحوصات الجودة
```javascript
isAcceptableQuality(text)
```
- التحقق من خلو النص من رموز خاصة مفرطة
- التحقق من عدم اختلاط الأحرف اللاتينية مع العربية بنسبة مرتفعة
- التحقق من الحد الأدنى من الطول

#### د) توليد عناوين صحفية عربية (NOT ترجمة حرفية)
```javascript
generateJournalisticHeadline(rawText, options)
```
بدل الترجمة الحرفية السيئة، يُنتج:
- استخراج المعلومات الأساسية من النص
- تصنيف نوع الخبر (صراع، اقتصاد، دبلوماسية، إلخ)
- توليد عنوان عربي احترافي وواضح

**أمثلة:**
```
بدل:  "ترامب عند مفترق بينما الولايات المتحدة..."
استخدم: "ترامب يدرس خيارات تصعيدية جديدة تجاه إيران"

بدل: "نفط سعر ارتفع في البورصة اليوم..."
استخدم: "أسعار النفط تشهد تطورات جديدة"
```

#### هـ) توليد ملخصات صحفية عربية
```javascript
generateJournalisticSummary(rawText, options)
```
- استخراج أول جملة مفيدة
- الحد من الطول
- إعادة صياغة واضحة وموجزة

### 2. الملفات المعدلة

#### `src/lib/i18n/summaryLocalizer.js` ⭐ الملف الرئيسي
**الإضافات:**
- `decodeHtmlEntities()` - فك الـ HTML entities
- `sanitizeText()` - تنظيف النصوص
- `isArabicText()` - التحقق من أن النص عربي
- `isAcceptableQuality()` - فحص جودة النص
- `needsCleaning()` - هل يحتاج تنظيف
- `extractKeyInfo()` - استخراج معلومات عن نوع الخبر
- `extractEntities()` - استخراج الأسماء والأماكن
- `generateJournalisticHeadline()` - توليد عنوان صحفي
- `generateJournalisticSummary()` - توليد ملخص
- `processNewsItem()` - الدالة الرئيسية لمعالجة خبر واحد
- `processBatchNews()` - معالجة مجموعة أخبار

**تحسين `localizeDisplayItem()`:**
- يستدعي الآن `processNewsItem()` للنصوص القذرة
- يحافظ على `localizeSummaryText()` كـ fallback للمحتوى الآمن

#### `src/components/NewsCard.jsx`
**التحسينات:**
- يستورد الآن `processNewsItem` و `needsCleaning`
- فحص ذكي: إذا كان النص يحتاج تنظيف، يُعالَج
- إذا كان النص آمنًا، يُستخدم `localizeSummaryText` الأسرع
- تحسين الأداء عبر `useMemo`

#### `src/App.jsx`
**التحسينات:**
- في `handleBreaking()` للأخبار الحية
- في `feedStatus.breaking` fallback
- يستخدم `processNewsItem` للعناوين التي تحتوي على entities

#### `src/pages/OverviewPage.jsx`
**التحسينات:**
- `localizeDisplayItem` تُطبق على كل الأخبار العاجلة

### 3. آلية العمل (Pipeline)

عندما يتم عرض خبر عربي:

```
1. تحقق: هل النص يحتوي على HTML entities أو رموز خاصة؟
   ↓
2. نعم → استدعِ processNewsItem()
   لا → استخدم localizeSummaryText (أسرع)
   ↓
3. في processNewsItem():
   ├─ فك HTML entities
   ├─ ننظف النص (sanitize)
   ├─ نتحقق من الجودة
   ├─ إذا جودة مقبولة ← اعرض النص المنظف
   └─ إذا جودة منخفضة ← وَلِّد عنوان صحفي جديد
   ↓
4. أعِد النص النظيف الجاهز للعرض
```

### 4. قواعس الجودة المطبقة

قبل عرض أي عنوان/ملخص بالعربية:

✅ **إذا احتوى على HTML entities** → فكّها
✅ **إذا احتوى على أحرف لاتينية كثيرة** → لا تعرضه مباشرة
✅ **إذا كان أطول من اللازم** → اختصره (180 حرف للملخص)
✅ **إذا كان غير مفهوم** → وَلِّد صياغة عربية مختصرة

### 5. الصياغة الصحفية العربية

تتبع هذه المعايير:
- 📰 **رسمي وواضح** - مناسب للأخبار
- ✏️ **موجز** - بدون حشو
- 🎯 **دقيق المعنى** - لا ترجمة حرفية
- 🌍 **أسلوب عالمي** - مناسب لجميع المستويات
- 🚫 **بدون لغة حرفية** - تجنب الترجمة الآلية

**أمثلة الصياغة المطبقة:**
```
✅ "إيران تتوعد بضرب منشآت الطاقة إذا تعرضت لهجوم"
✅ "روسيا تشن هجومًا بالمسيّرات على أوكرانيا"
✅ "زيلينسكي يرسل مفاوضين إلى واشنطن لإحياء المسار الدبلوماسي"
✅ "أسعار النفط تشهد تطورات جديدة وسط التوترات العالمية"
```

### 6. البيانات الوصفية المُضافة

كل خبر معالج يحتوي الآن على:
```javascript
{
  // النص النهائي الجاهز للعرض
  title: "...",
  summary: "...",
  
  // معلومات الجودة
  qualityScore: "high" | "medium",
  isArabic: true | false,
  
  // الأصول للمرجع (إن لزم)
  _original: { title, summary },
  _decoded: { title, summary },
  _sanitized: { title, summary },
}
```

## ملخص التحسينات

| المشكلة | الحل | الملف |
|--------|------|------|
| HTML entities مرئية | `decodeHtmlEntities()` | summaryLocalizer.js |
| نصوص مشوّهة | `sanitizeText()` | summaryLocalizer.js |
| ترجمات حرفية سيئة | `generateJournalisticHeadline()` | summaryLocalizer.js |
| بدون فحص جودة | `isAcceptableQuality()` | summaryLocalizer.js |
| معالجة متقطعة | `processNewsItem()` موحد | summaryLocalizer.js + محتويات آخرى |
| performance | `useMemo` + فحص ذكي | NewsCard.jsx |

## اختبار يدوي

لاختبار الميزات الجديدة:

1. **اذهب إلى صفحة الأخبار** (`/news`)
2. **غيّر اللغة إلى العربية**
3. **لاحظ:**
   - ✅ عدم ظهور `&#039;` أو `&amp;`
   - ✅ عناوين واضحة وصحفية
   - ✅ ملخصات موجزة مفهومة
   - ✅ عدم خلط الأحرف اللاتينية مع العربية

## الأداء

- معالجة العناوين الآمنة بدون معالجة ثقيلة (عبر `localizeSummaryText`)
- معالجة العناوين القذرة بالكامل عند الحاجة فقط
- Caching يتم على مستوى summary localization

## الملفات المرتبطة

- `src/pages/NewsPage.jsx` - الصفحة الرئيسية
- `src/pages/OverviewPage.jsx` - الملخص التنفيذي
- `src/pages/WorldStatePage.jsx` - حالة العالم
- `src/lib/useDashboardData.js` - معالجة البيانات
- `src/components/LiveAlertDrawer.jsx` - التنبيهات المباشرة
- `src/components/NewsCard.jsx` - بطاقة الخبر الواحد
- `src/App.jsx` - البث المباشر
