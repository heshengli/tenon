# Font Awesome 6.7.2 (Free)

菜单图标使用 Font Awesome Free，本地自托管，运行时不依赖外网。

- 来源：https://fontawesome.com/ （通过 cdnjs 下载）
- 版本：6.7.2
- 目录：
  - `css/all.min.css`
  - `webfonts/fa-solid-900.woff2`（菜单图标使用的字体）
  - `webfonts/fa-regular-400.woff2`
  - `webfonts/fa-brands-400.woff2`
  - `webfonts/fa-v4compatibility.woff2`

## 许可

- 图标（Icons）：CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
- 字体（Fonts）：SIL OFL 1.1 — https://scripts.sil.org/OFL
- 代码（Code）：MIT — https://opensource.org/licenses/MIT

版权归 Fonticons, Inc. 所有。使用时请保留本声明。

## 替换 / 升级步骤

```bash
BASE=https://cdnjs.cloudflare.com/ajax/libs/font-awesome/<版本>
curl -o css/all.min.css $BASE/css/all.min.css
curl -o webfonts/fa-solid-900.woff2 $BASE/webfonts/fa-solid-900.woff2
```

`all.min.css` 中的字体路径是相对路径 `../webfonts/`，保持 `css/` 与 `webfonts/`
同级即可。只需要 woff2（现代浏览器首选），未使用的字族不会被请求。
