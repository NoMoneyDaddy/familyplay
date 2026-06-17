// TypeScript 6 對「副作用匯入」（import './globals.css'）會要求模組型別宣告，
// 否則報 TS2882。TS 5.x 以前默許未具型別的副作用匯入。
// 為全域樣式表（如 app/globals.css）提供環境宣告。
declare module '*.css'
