import { Extension } from "../sdk"
import en from "./i18n/en"

export default Extension.define({
  id: "terminal",
  i18n: {
    en,
    ar: () => import("./i18n/ar"),
  },
})
