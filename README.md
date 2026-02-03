# Rubik Cube Solver

אפליקציה אינטראקטיבית לפתרון קובייה הונגרית עם מצב משחק, לימוד, והזנת קובייה ידנית/מצלמה.

## פיצ'רים עיקריים
- קובייה תלת־ממדית אינטראקטיבית
- מצב Play + Learn
- Enter עם הזנת צבעים ידנית
- Camera Capture לצילום מהיר של כל פאה

## פיתוח מקומי
```bash
npm install
npm run dev
```

## בדיקות
```bash
npm run test:run
npm run test:playwright:smoke
npm run test:playwright
```

## דיפלוי ל־Vercel
הפרויקט מוגדר כ־SPA, כולל `vercel.json` עם rewrite ל־`/index.html`.

```bash
vercel
vercel --prod
```
