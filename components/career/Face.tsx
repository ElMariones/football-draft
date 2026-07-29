'use client';

// Renders a FaceGenes bag as vector art at a given age. Everything is drawn
// from the genes plus the age modifiers, so the same player is recognisably
// himself at 16 and at 38 — just with a beard, lines and grey added.
//
// The hair is the part worth explaining. Drawing each style as its own closed
// blob is what made the old version fail: every path had to re-guess the skull
// and they all came out as thin bands floating across the forehead. Instead a
// style now only declares *where its hairline sits* — a single curve running
// right to left across the head — and the renderer fills everything above that
// curve, clipped to the head silhouette. Coverage of the scalp is therefore
// guaranteed by construction for every style, at every head shape, and a style
// is just a hairline plus optional volume drawn behind or in front of the head.
import {
  SKIN, HAIR, EYES, HAIR_STYLES, BEARDS, RECEDES, ageFace, greyed, shade, type FaceGenes,
} from '@/lib/career/face';

const HEAD: Record<number, string> = {
  // oval, square, round, long
  0: 'M50 14 C70 14 80 30 80 48 C80 72 66 90 50 90 C34 90 20 72 20 48 C20 30 30 14 50 14 Z',
  1: 'M50 14 C71 14 81 28 81 46 C81 70 72 90 50 90 C28 90 19 70 19 46 C19 28 29 14 50 14 Z',
  2: 'M50 15 C72 15 83 32 83 51 C83 73 68 91 50 91 C32 91 17 73 17 51 C17 32 28 15 50 15 Z',
  3: 'M50 12 C68 12 78 28 78 48 C78 76 64 94 50 94 C36 94 22 76 22 48 C22 28 32 12 50 12 Z',
};

/**
 * Fill everything above a hairline. `curve` is drawn right-to-left and must end
 * back at x=2; the rest of the box is closed off above the top of the head.
 */
const above = (yRight: number, curve: string) => `M2 -20 H98 V${yRight} ${curve} Z`;

/** The hairline for each style, as a curve from (98, y) across to (2, y). */
function hairline(style: string, hy: number): string {
  // hy is the base hairline depth; balding pushes it up the forehead.
  switch (style) {
    case 'buzz': // sits low and even, barely a hairline at all
      return above(hy + 8, `C86 ${hy + 7} 68 ${hy + 5} 50 ${hy + 5} C32 ${hy + 5} 14 ${hy + 7} 2 ${hy + 8}`);
    case 'fade': // sharp, high, square across the front
      return above(hy + 10, `L78 ${hy + 10} C74 ${hy - 1} 64 ${hy - 2} 50 ${hy - 2} C36 ${hy - 2} 26 ${hy - 1} 22 ${hy + 10} L2 ${hy + 10}`);
    case 'crop': // straight blunt fringe
      return above(hy + 6, `C86 ${hy + 4} 70 ${hy + 2} 50 ${hy + 2} C30 ${hy + 2} 14 ${hy + 4} 2 ${hy + 6}`);
    case 'caesar': // low straight fringe, forehead almost gone
      return above(hy + 8, `C86 ${hy + 8} 70 ${hy + 7} 50 ${hy + 7} C30 ${hy + 7} 14 ${hy + 8} 2 ${hy + 8}`);
    case 'sidepart': // parted — one temple higher than the other
      return above(hy + 4, `C88 ${hy + 1} 74 ${hy - 2} 60 ${hy + 1} C52 ${hy + 3} 44 ${hy + 8} 30 ${hy + 7} C18 ${hy + 6} 8 ${hy + 5} 2 ${hy + 6}`);
    case 'quiff':
    case 'pompadour':
    case 'spiky': // swept up off the forehead
      return above(hy + 4, `C86 ${hy + 1} 68 ${hy - 1} 50 ${hy - 1} C32 ${hy - 1} 14 ${hy + 1} 2 ${hy + 4}`);
    case 'receding': // deep temple notches with a widow's peak between them
      return above(hy + 12, `C92 ${hy + 2} 84 ${hy - 8} 72 ${hy - 7} C62 ${hy - 6} 56 ${hy + 4} 50 ${hy + 4} C44 ${hy + 4} 38 ${hy - 6} 28 ${hy - 7} C16 ${hy - 8} 8 ${hy + 2} 2 ${hy + 12}`);
    case 'curly':
    case 'afro': // bumpy, sits low around the whole crown
      return above(hy + 7, `C90 ${hy + 3} 82 ${hy + 8} 72 ${hy + 4} C64 ${hy + 1} 60 ${hy + 7} 50 ${hy + 5} C40 ${hy + 3} 36 ${hy + 8} 28 ${hy + 4} C18 ${hy + 8} 10 ${hy + 3} 2 ${hy + 7}`);
    case 'dreads':
    case 'braids':
      return above(hy + 6, `C88 ${hy + 4} 70 ${hy + 3} 50 ${hy + 3} C30 ${hy + 3} 12 ${hy + 4} 2 ${hy + 6}`);
    default: // short / mid / long / mullet / topknot / manbun — a soft widow's peak
      return above(hy + 5, `C88 ${hy + 1} 74 ${hy} 62 ${hy + 1} C56 ${hy + 2} 53 ${hy + 6} 50 ${hy + 6} C47 ${hy + 6} 44 ${hy + 2} 38 ${hy + 1} C26 ${hy} 12 ${hy + 1} 2 ${hy + 5}`);
  }
}

/**
 * Hair hanging below the hairline, still clipped to the head. These were plain
 * rectangles, which read as dark slabs bolted to the sides of the face; they are
 * now tapered so the hair narrows as it comes down past the temple.
 */
function sidePanels(style: string): string | null {
  const taper = (bottom: number, inset: number) =>
    `M2 18 H${24 - inset} C${22 - inset} ${bottom * 0.55} ${20 - inset} ${bottom * 0.8} ${16 - inset} ${bottom} H2 Z`
    + ` M98 18 H${76 + inset} C${78 + inset} ${bottom * 0.55} ${80 + inset} ${bottom * 0.8} ${84 + inset} ${bottom} H98 Z`;
  switch (style) {
    case 'long': return taper(80, 0);
    case 'mid': return taper(62, 0);
    case 'curly': return taper(58, 1);
    case 'mullet': return taper(54, 2);
    case 'dreads':
    case 'braids': return taper(58, 1);
    case 'sidepart':
    case 'short':
    case 'crop': return taper(46, 3);
    default: return null;
  }
}

/**
 * Volume above the skull. Without this every short style was the same brown cap:
 * the hairline alone moves only a few pixels and simply cannot tell a buzz cut
 * apart from a crop at the size these render. This is what actually gives a
 * style its silhouette, so it is drawn behind the head and pokes out over the top.
 */
function crown(style: string): { rx: number; ry: number; cy: number; dx?: number } | null {
  switch (style) {
    case 'buzz': return { rx: 31.5, ry: 19, cy: 32 };
    case 'fade': return { rx: 31, ry: 20, cy: 33 };
    case 'caesar': return { rx: 33, ry: 22, cy: 33 };
    case 'crop': return { rx: 33.5, ry: 24, cy: 33 };
    case 'short': return { rx: 34, ry: 26, cy: 34 };
    case 'sidepart': return { rx: 35, ry: 27, cy: 35, dx: -3 };
    case 'mid': return { rx: 35, ry: 28, cy: 35 };
    case 'long': return { rx: 35, ry: 28, cy: 35 };
    case 'mullet': return { rx: 34, ry: 26, cy: 34 };
    case 'spiky': return { rx: 33, ry: 22, cy: 34 };
    case 'quiff':
    case 'pompadour': return { rx: 33, ry: 23, cy: 35 };
    default: return null;
  }
}

export default function Face({
  genes, age, size = 96, className = '',
}: { genes: FaceGenes; age: number; size?: number; className?: string }) {
  const a = ageFace(genes, age);
  const skin = SKIN[genes.skin] ?? SKIN[2];
  const hairBase = HAIR[genes.hairColor] ?? HAIR[1];
  const hair = greyed(hairBase, a.grey);
  const hairDark = shade(hair, 0.78);
  const beardCol = greyed(shade(hairBase, 1.3), a.grey * 1.15);
  const eye = EYES[genes.eyeColor] ?? EYES[0];
  const style = HAIR_STYLES[genes.hairStyle] ?? 'short';
  const beard = BEARDS[genes.beard] ?? 'none';
  const line = shade(skin, 0.78);
  const uid = `f${genes.skin}${genes.hairColor}${genes.hairStyle}${genes.faceShape}${genes.eyeColor}${genes.beard}`;
  const headPath = HEAD[genes.faceShape] ?? HEAD[0];

  const bald = style === 'bald';
  // Only some styles recede, and only that recession moves the hairline.
  const recede = RECEDES.has(style) ? a.balding : 0;
  const hy = 30 - recede * 9;
  const sides = sidePanels(style);
  const cr = crown(style);
  const showBeard = a.beardGrowth > 0.05 && beard !== 'none';
  const beardOp = 0.38 + a.beardGrowth * 0.5;

  return (
    <svg viewBox="0 0 100 104" width={size} height={size} className={className} role="img" aria-label="player face">
      <defs>
        <clipPath id={`head${uid}`}><path d={headPath} /></clipPath>
        <linearGradient id={`sk${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={shade(skin, 1.06)} />
          <stop offset="100%" stopColor={shade(skin, 0.9)} />
        </linearGradient>
        <linearGradient id={`hr${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={shade(hair, 1.16)} />
          <stop offset="70%" stopColor={hair} />
          <stop offset="100%" stopColor={hairDark} />
        </linearGradient>
      </defs>

      {/* ---- volume behind the head: what gives a style its silhouette ---- */}
      {!bald && (
        <g fill={`url(#hr${uid})`}>
          {cr && <ellipse cx={50 + (cr.dx ?? 0)} cy={cr.cy - recede * 4} rx={cr.rx} ry={cr.ry} />}
          {/* Everything here must stay inside the 100x104 viewBox — an afro drawn
              any bigger gets sliced flat by the viewport edge instead of reading
              as round. Wide rather than tall is what fits. */}
          {style === 'afro' && (
            <>
              <ellipse cx="50" cy="34" rx="37" ry="29" />
              {[[18, 18], [34, 7], [50, 4], [66, 7], [82, 18], [14, 44], [86, 44]].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="11" />
              ))}
            </>
          )}
          {style === 'curly' && (
            <>
              <ellipse cx="50" cy="30" rx="33" ry="25" />
              {[[20, 34], [28, 16], [50, 10], [72, 16], [80, 34], [16, 50], [84, 50]].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="9" />
              ))}
            </>
          )}
          {style === 'long' && <path d="M16 30 C6 44 8 74 14 92 L30 92 C24 74 24 50 28 34 Z M84 30 C94 44 92 74 86 92 L70 92 C76 74 76 50 72 34 Z" />}
          {style === 'mid' && <path d="M18 30 C10 44 12 62 16 70 L30 66 C26 54 26 42 29 33 Z M82 30 C90 44 88 62 84 70 L70 66 C74 54 74 42 71 33 Z" />}
          {style === 'mullet' && <path d="M20 34 C12 46 14 72 20 84 L34 80 C28 66 28 46 31 36 Z M80 34 C88 46 86 72 80 84 L66 80 C72 66 72 46 69 36 Z" />}
          {/* The strands have to hang outside the head silhouette or they are
              simply hidden behind it — which is what made this read as a plain cap. */}
          {style === 'dreads' && (
            <>
              <ellipse cx="50" cy="29" rx="34" ry="23" />
              {[9, 15.5, 22, 78, 84.5, 91].map((x, i) => (
                <rect key={i} x={x - 3} y={26 + (i % 3) * 5} width="6" height={40 + (i % 3) * 12} rx="3" />
              ))}
            </>
          )}
          {style === 'braids' && <ellipse cx="50" cy="28" rx="32" ry="22" />}
          {style === 'manbun' && (
            <>
              <ellipse cx="50" cy="28" rx="31" ry="21" />
              <circle cx="50" cy="16" r="9" />
            </>
          )}
          {style === 'pompadour' && <path d="M28 28 C30 6 74 4 76 28 C68 16 36 16 28 28 Z" />}
          {style === 'quiff' && <path d="M40 26 C40 8 68 6 66 24 C60 12 46 16 40 26 Z" />}
          {style === 'spiky' && (
            <path d="M22 32 L28 12 L34 30 L40 8 L46 28 L52 6 L58 28 L64 10 L70 30 L76 14 L80 34 Z" />
          )}
          {style === 'topknot' && <ellipse cx="50" cy="12" rx="8" ry="9" />}
        </g>
      )}

      {/* neck + shoulders so the head does not float */}
      <path d="M40 82 H60 V92 C60 96 68 98 74 100 L26 100 C32 98 40 96 40 92 Z" fill={shade(skin, 0.86)} />

      {/* ears */}
      {[18, 82].map((x, i) => (
        <ellipse key={i} cx={x} cy={54} rx={genes.ears === 0 ? 4 : genes.ears === 1 ? 5.5 : 7}
          ry={genes.ears === 2 ? 9 : 7.5} fill={shade(skin, 0.94)} />
      ))}

      {/* head */}
      <path d={headPath} fill={`url(#sk${uid})`} />

      <g clipPath={`url(#head${uid})`}>
        {/* freckles */}
        {genes.freckles && [...Array(10)].map((_, i) => (
          <circle key={i} cx={34 + (i % 5) * 8} cy={54 + Math.floor(i / 5) * 5}
            r="0.9" fill={shade(skin, 0.8)} opacity="0.7" />
        ))}

        {/* brows — thickness and angle from the gene */}
        {[32, 68].map((cx, i) => {
          const dir = i === 0 ? 1 : -1;
          const tilt = genes.brow === 0 ? 0 : genes.brow === 1 ? 2 : -2;
          return (
            <path key={i}
              d={`M${cx - 8 * dir} ${44 + tilt} Q${cx} ${40} ${cx + 8 * dir} ${44 - tilt}`}
              stroke={greyed(hairBase, a.grey * 0.8)} strokeWidth={genes.brow === 2 ? 4 : 3}
              fill="none" strokeLinecap="round" />
          );
        })}

        {/* eyes */}
        {[36, 64].map((cx, i) => (
          <g key={i}>
            <ellipse cx={cx} cy={52} rx="7" ry={4.6} fill="#fff" />
            <circle cx={cx} cy={52} r="3.1" fill={eye} />
            <circle cx={cx} cy={52} r="1.4" fill="#12100f" />
            <circle cx={cx - 1.1} cy={50.8} r="0.9" fill="#fff" opacity="0.9" />
            <path d={`M${cx - 7} 51 Q${cx} ${46.5} ${cx + 7} 51`} stroke={line} strokeWidth="1.3" fill="none" />
            {a.wrinkles > 0.15 && (
              <path d={`M${cx + (i ? 8 : -8)} 50 l${i ? 3 : -3} -2 M${cx + (i ? 8 : -8)} 53 l${i ? 3.5 : -3.5} 1`}
                stroke={line} strokeWidth="0.8" opacity={a.wrinkles} fill="none" strokeLinecap="round" />
            )}
          </g>
        ))}

        {/* nose */}
        <path
          d={genes.nose === 0
            ? 'M50 54 L47 64 Q50 66 53 64 Z'
            : genes.nose === 1
              ? 'M50 53 L45.5 65 Q50 68 54.5 65 Z'
              : 'M50 54 L46 66 Q50 67.5 54 66 Z'}
          fill={shade(skin, 0.93)} stroke={line} strokeWidth="0.7" strokeLinejoin="round" />

        {/* forehead + nasolabial lines with age */}
        {a.wrinkles > 0.2 && (
          <g stroke={line} strokeWidth="0.9" fill="none" opacity={a.wrinkles * 0.85} strokeLinecap="round">
            <path d={`M34 ${hy + 12} Q50 ${hy + 8} 66 ${hy + 12}`} />
            <path d={`M36 ${hy + 17} Q50 ${hy + 13.5} 64 ${hy + 17}`} opacity={a.wrinkles > 0.55 ? 1 : 0} />
            <path d="M43 66 Q40 73 42 79" />
            <path d="M57 66 Q60 73 58 79" />
          </g>
        )}

        {/* ---- facial hair, clipped so it always follows the jaw ---- */}
        {showBeard && (
          <g fill={beardCol} opacity={beardOp}>
            {/* the jaw-covering shapes */}
            {beard === 'stubble' && (
              <path d="M15 56 C15 84 32 96 50 96 C68 96 85 84 85 56 C83 78 70 87 50 87 C30 87 17 78 15 56 Z" opacity="0.5" />
            )}
            {/* full covers the cheeks; boxed is trimmed neat and low; chinstrap is
                a band that only follows the jaw. Cheek height is what separates them. */}
            {(beard === 'full' || beard === 'long') && (
              <path d="M15 53 C15 86 32 99 50 99 C68 99 85 86 85 53 C83 64 73 69 50 69 C27 69 17 64 15 53 Z" />
            )}
            {beard === 'boxed' && (
              <path d="M20 60 C20 86 34 96 50 96 C66 96 80 86 80 60 C77 72 66 77 50 77 C34 77 23 72 20 60 Z" />
            )}
            {beard === 'chinstrap' && (
              <path d="M15 54 C15 86 31 98 50 98 C69 98 85 86 85 54 C82 78 68 85 50 85 C32 85 18 78 15 54 Z"
                fillRule="evenodd" />
            )}
            {/* sideburns down the jaw only — no chin, which is what makes it mutton */}
            {beard === 'mutton' && (
              <path d="M13 44 C13 68 17 82 27 90 C25 74 23 58 24 44 Z M87 44 C87 68 83 82 73 90 C75 74 77 58 76 44 Z" />
            )}
            {beard === 'goatee' && (
              <path d="M40 76 Q50 71 60 76 Q60 93 50 96 Q40 93 40 76 Z" />
            )}
            {beard === 'van-dyke' && (
              <path d="M42 78 Q50 74 58 78 Q58 92 50 95 Q42 92 42 78 Z" />
            )}
            {beard === 'soul-patch' && <rect x="46" y="80" width="8" height="6" rx="2" />}

            {/* moustaches, layered on top where the style has one */}
            {['moustache', 'van-dyke', 'full', 'long', 'boxed', 'mutton'].includes(beard) && (
              <path d="M39 70 Q50 65 61 70 Q56 74 50 73 Q44 74 39 70 Z" />
            )}
            {beard === 'goatee' && <path d="M42 70 Q50 66 58 70 Q50 73 42 70 Z" />}
          </g>
        )}

        {/* The mouth sits on top of the facial hair. Drawn underneath, a full
            beard simply swallowed it and every heavy style became one dark mass. */}
        {genes.mouth === 0 && <path d="M42 76 Q50 80 58 76" stroke="#B4635A" strokeWidth="2.4" fill="none" strokeLinecap="round" />}
        {genes.mouth === 1 && <path d="M42 76 Q50 82 58 76 Q50 79 42 76 Z" fill="#B4635A" />}
        {genes.mouth === 2 && <path d="M43 77 H57" stroke="#A85A52" strokeWidth="2.2" strokeLinecap="round" />}

        {/* ---- hair: everything above the hairline, so the scalp is always covered ---- */}
        {!bald && (
          <g fill={`url(#hr${uid})`}>
            {sides && <path d={sides} />}
            <path d={hairline(style, hy)} />
            {/* a fade is shorter at the sides than on top */}
            {style === 'fade' && (
              <path d="M2 30 H22 V62 H2 Z M78 30 H98 V62 H78 Z" opacity="0.45" />
            )}
            {/* the parting line */}
            {style === 'sidepart' && (
              <path d={`M33 ${hy + 6} C40 ${hy - 4} 52 ${hy - 8} 66 ${hy - 6}`}
                stroke={shade(hair, 0.6)} strokeWidth="1.6" fill="none" strokeLinecap="round" />
            )}
            {/* cornrows */}
            {style === 'braids' && [26, 34, 42, 50, 58, 66, 74].map((x, i) => (
              <path key={i} d={`M${x} ${hy + 6} C${x - 2} ${hy - 6} ${x - 1} ${hy - 14} ${50 + (x - 50) * 0.35} 8`}
                stroke={shade(hair, 0.55)} strokeWidth="1.4" fill="none" strokeLinecap="round" />
            ))}
            {/* curl texture on top */}
            {(style === 'curly' || style === 'afro') && (
              <g fill={shade(hair, 1.18)} opacity="0.5">
                {[[34, 18], [50, 14], [66, 18], [26, 28], [74, 28], [42, 24], [58, 24]].map(([x, y], i) => (
                  <circle key={i} cx={x} cy={y} r="4.5" />
                ))}
              </g>
            )}
          </g>
        )}
      </g>

      {/* A long beard has to hang past the jaw, so it cannot live inside the
          head clip like the others — that is the whole point of it. */}
      {showBeard && beard === 'long' && (
        <path d="M28 76 C28 96 36 106 50 106 C64 106 72 96 72 76 C68 88 60 92 50 92 C40 92 32 88 28 76 Z"
          fill={beardCol} opacity={beardOp} />
      )}

      {/* volume that must sit in front of the head silhouette */}
      {!bald && (
        <g fill={`url(#hr${uid})`}>
          {style === 'topknot' && <ellipse cx="50" cy="12" rx="8" ry="9" />}
          {style === 'quiff' && <path d="M42 26 C42 10 66 8 64 24 C58 14 48 18 42 26 Z" />}
        </g>
      )}

      {/* outline last */}
      <path d={headPath} fill="none" stroke={shade(skin, 0.7)} strokeWidth="1.1" />
    </svg>
  );
}
