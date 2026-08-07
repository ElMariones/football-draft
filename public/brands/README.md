# Brand logos

Drop a logo image in here and it is used everywhere that brand appears — the
side panel, the offer cards, the event modals and the career summary.

    public/brands/<brand-id>.png      (.svg / .webp / .jpg also work)

The `<brand-id>` is the id in [`data/career/brands.ts`](../../data/career/brands.ts),
e.g. `nike`, `new-balance`, `tag-heuer`, `le-coq`.

Then regenerate the manifest:

    npm run brands

## What resolves, in order

1. **A file in this folder.** Wins over everything.
2. **The official mark** carried by `simple-icons`, for the 13 brands it has
   (Nike, adidas, Puma, New Balance, Under Armour, Reebok, Audi, BMW, Emirates,
   Red Bull, Dior, Beats, Movistar). Real logo geometry in the brand's own hex.
3. **A drawn glyph** — original artwork, not anybody's logo — so a brand with no
   available mark still renders as something deliberate. These are listed in
   `DRAWN_ONLY` in `data/career/brandLogos.ts`; there are currently 20.

## Notes

- Square-ish artwork with a transparent background works best. Everything is
  rendered `object-contain` on a white tile, at sizes from 16px to 44px.
- Logos are trademarks of their respective owners. They appear here to identify
  the brands they refer to. Whatever you put in this folder ships in the repo
  and on the deployed site, so use marks you are comfortable distributing.
