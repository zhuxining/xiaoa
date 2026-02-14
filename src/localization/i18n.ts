import i18n from "i18next";
import { initReactI18next } from "react-i18next";

i18n.use(initReactI18next).init({
  fallbackLng: "zh-CN",
  resources: {
    "zh-CN": {
      translation: {
        appName: "小A",
        titleHomePage: "首页",
        titleSecondPage: "第二页",
        documentation: "文档",
        madeBy: "某人",
      },
    },
    en: {
      translation: {
        appName: "xiaoa",
        titleHomePage: "Home Page",
        titleSecondPage: "Second Page",
        documentation: "Documentation",
        madeBy: "Made by LuanRoger",
      },
    },
  },
});
