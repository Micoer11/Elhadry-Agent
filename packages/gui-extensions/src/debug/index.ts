import { Extension } from "../sdk"
import { HeapSnapshots } from "./contract"
import en from "./i18n/en"

export default Extension.define({
  id: "debug",
  provides: { heap: HeapSnapshots },
  i18n: {
    en,
    ar: () => import("./i18n/ar"),
  },
})
