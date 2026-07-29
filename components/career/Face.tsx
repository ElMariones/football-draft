'use client';

// Renders a FaceGenes bag as vector art at a given age. Everything is drawn
// from the genes plus the age modifiers, so the same player is recognisably
// himself at 16 and at 38 — just with a beard, lines and grey added.
import {
  SKIN, HAIR, EYES, HAIR_STYLES, BEARDS, ageFace, greyed, shade, type FaceGenes,
} from '@/lib/career/face';

const HEAD: Record<number, string> = {
  // oval, square, round, long
  0: 'M50 14 C70 14 80 30 80 48 C80 72 66 90 50 90 C34 90 20 72 20 48 C20 30 30 14 50 14 Z',
  1: 'M50 14 C71 14 81 28 81 46 C81 70 72 90 50 90 C28 90 19 70 19 46 C19 28 29 14 50 14 Z',
  2: 'M50 15 C72 15 83 32 83 51 C83 73 68 91 50 91 C32 91 17 73 17 51 C17 32 28 15 50 15 Z',
  3: 'M50 12 C68 12 78 28 78 48 C78 76 64 94 50 94 C36 94 22 76 22 48 C22 28 32 12 50 12 Z',
};

export default function Face({
  genes, age, size = 96, className = '',
}: { genes: FaceGenes; age: number; size?: number; className?: string }) {
  const a = ageFace(genes, age);
  const skin = SKIN[genes.skin] ?? SKIN[2];
  const hairBase = HAIR[genes.hairColor] ?? HAIR[1];
  const hair = greyed(hairBase, a.grey);
  const beardCol = greyed(hairBase, a.grey * 1.15);
  const eye = EYES[genes.eyeColor] ?? EYES[0];
  const style = HAIR_STYLES[genes.hairStyle];
  const beard = BEARDS[genes.beard];
  const line = shade(skin, 0.78);
  const uid = `f${genes.skin}${genes.hairColor}${genes.hairStyle}${genes.faceShape}${genes.eyeColor}`;

  // hairline pulls back with balding
  const hy = 14 + a.balding * 7;

  return (
    <svg viewBox="0 0 100 104" width={size} height={size} className={className} role="img" aria-label="player face">
      <defs>
        <clipPath id={`head${uid}`}><path d={HEAD[genes.faceShape] ?? HEAD[0]} /></clipPath>
        <linearGradient id={`sk${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={shade(skin, 1.06)} />
          <stop offset="100%" stopColor={shade(skin, 0.9)} />
        </linearGradient>
      </defs>

      {/* neck + shoulders so the head does not float */}
      <path d="M40 82 H60 V92 C60 96 68 98 74 100 L26 100 C32 98 40 96 40 92 Z" fill={shade(skin, 0.86)} />

      {/* ears */}
      {[18, 82].map((x, i) => (
        <ellipse key={i} cx={x} cy={54} rx={genes.ears === 0 ? 4 : genes.ears === 1 ? 5.5 : 7}
          ry={genes.ears === 2 ? 9 : 7.5} fill={shade(skin, 0.94)} />
      ))}

      {/* head */}
      <path d={HEAD[genes.faceShape] ?? HEAD[0]} fill={`url(#sk${uid})`} />

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
            {/* upper lid */}
            <path d={`M${cx - 7} 51 Q${cx} ${46.5} ${cx + 7} 51`} stroke={line} strokeWidth="1.3" fill="none" />
            {/* crow's feet */}
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

        {/* mouth */}
        {genes.mouth === 0 && <path d="M42 75 Q50 79 58 75" stroke={shade('#B4635A', 1)} strokeWidth="2.4" fill="none" strokeLinecap="round" />}
        {genes.mouth === 1 && <path d="M42 75 Q50 81 58 75 Q50 78 42 75 Z" fill="#B4635A" />}
        {genes.mouth === 2 && <path d="M43 76 H57" stroke="#A85A52" strokeWidth="2.2" strokeLinecap="round" />}

        {/* forehead + nasolabial lines with age */}
        {a.wrinkles > 0.2 && (
          <g stroke={line} strokeWidth="0.9" fill="none" opacity={a.wrinkles * 0.85} strokeLinecap="round">
            <path d="M34 34 Q50 30 66 34" />
            <path d="M36 39 Q50 35.5 64 39" opacity={a.wrinkles > 0.55 ? 1 : 0} />
            <path d="M43 66 Q40 73 42 79" />
            <path d="M57 66 Q60 73 58 79" />
          </g>
        )}

        {/* ---- beard, grown in ---- */}
        {a.beardGrowth > 0.05 && beard !== 'none' && (
          <g fill={beardCol} opacity={0.35 + a.beardGrowth * 0.65}>
            {beard === 'stubble' && (
              <path d="M24 58 C26 82 38 92 50 92 C62 92 74 82 76 58 C74 78 64 86 50 86 C36 86 26 78 24 58 Z" opacity="0.55" />
            )}
            {beard === 'full' && (
              <path d="M23 56 C25 84 38 95 50 95 C62 95 75 84 77 56 C75 66 68 70 50 70 C32 70 25 66 23 56 Z" />
            )}
            {beard === 'goatee' && (
              <path d="M42 78 Q50 74 58 78 Q58 90 50 92 Q42 90 42 78 Z" />
            )}
            {beard === 'chinstrap' && (
              <path d="M23 56 C25 84 38 94 50 94 C62 94 75 84 77 56 C74 80 63 88 50 88 C37 88 26 80 23 56 Z" />
            )}
            {(beard === 'moustache' || beard === 'full' || beard === 'goatee') && (
              <path d="M41 71 Q50 67 59 71 Q50 74 41 71 Z" />
            )}
          </g>
        )}

        {/* ---- hair ---- */}
        <g fill={hair}>
          {style === 'bald' && null}
          {style === 'buzz' && <path d={`M20 ${hy + 34} C20 ${hy + 6} 34 ${hy - 2} 50 ${hy - 2} C66 ${hy - 2} 80 ${hy + 6} 80 ${hy + 34} C76 ${hy + 28} 66 ${hy + 26} 50 ${hy + 26} C34 ${hy + 26} 24 ${hy + 28} 20 ${hy + 34} Z`} opacity="0.9" />}
          {style === 'short' && <path d={`M19 ${hy + 32} C19 ${hy + 4} 33 ${hy - 4} 50 ${hy - 4} C67 ${hy - 4} 81 ${hy + 4} 81 ${hy + 32} C78 ${hy + 27} 68 ${hy + 25} 50 ${hy + 25} C32 ${hy + 25} 22 ${hy + 27} 19 ${hy + 32} Z`} />}
          {style === 'mid' && <path d={`M18 ${hy + 38} C18 ${hy + 2} 33 ${hy - 5} 50 ${hy - 5} C67 ${hy - 5} 82 ${hy + 2} 82 ${hy + 38} C80 ${hy + 28} 70 ${hy + 25} 50 ${hy + 25} C30 ${hy + 25} 20 ${hy + 28} 18 ${hy + 38} Z`} />}
          {style === 'receding' && <path d={`M22 ${hy + 30} C24 ${hy + 25} 34 ${hy + 2} 50 ${hy + 4} C66 ${hy + 2} 76 ${hy + 25} 78 ${hy + 30} C74 ${hy + 28} 64 ${hy + 27} 50 ${hy + 27} C36 ${hy + 27} 26 ${hy + 28} 22 ${hy + 30} Z`} />}
          {style === 'quiff' && (
            <>
              <path d={`M19 ${hy + 30} C19 ${hy + 2} 33 ${hy - 6} 50 ${hy - 6} C67 ${hy - 6} 81 ${hy + 2} 81 ${hy + 30} C77 ${hy + 26} 67 ${hy + 24} 50 ${hy + 24} C33 ${hy + 24} 23 ${hy + 26} 19 ${hy + 30} Z`} />
              <path d={`M44 ${hy - 4} C46 ${hy - 16} 62 ${hy - 14} 60 ${hy + 2} C56 ${hy - 6} 48 ${hy - 7} 44 ${hy - 4} Z`} />
            </>
          )}
          {style === 'curly' && (
            <>
              <path d={`M19 ${hy + 32} C19 ${hy + 2} 33 ${hy - 5} 50 ${hy - 5} C67 ${hy - 5} 81 ${hy + 2} 81 ${hy + 32} C78 ${hy + 27} 68 ${hy + 25} 50 ${hy + 25} C32 ${hy + 25} 22 ${hy + 27} 19 ${hy + 32} Z`} />
              {[26, 36, 50, 64, 74].map((x, i) => (
                <circle key={i} cx={x} cy={hy + (i % 2 ? -1 : 2)} r="8" />
              ))}
            </>
          )}
          {style === 'afro' && (
            <>
              <ellipse cx="50" cy={hy + 10} rx="36" ry="28" />
              <path d={`M20 ${hy + 30} C24 ${hy + 28} 34 ${hy + 26} 50 ${hy + 26} C66 ${hy + 26} 76 ${hy + 28} 80 ${hy + 30} Z`} />
            </>
          )}
          {style === 'long' && (
            <>
              <path d={`M18 ${hy + 34} C18 ${hy + 1} 33 ${hy - 6} 50 ${hy - 6} C67 ${hy - 6} 82 ${hy + 1} 82 ${hy + 34} C80 ${hy + 27} 70 ${hy + 25} 50 ${hy + 25} C30 ${hy + 25} 20 ${hy + 27} 18 ${hy + 34} Z`} />
              <path d={`M18 ${hy + 20} C12 ${hy + 50} 16 ${hy + 66} 22 ${hy + 70} L26 ${hy + 40} Z`} />
              <path d={`M82 ${hy + 20} C88 ${hy + 50} 84 ${hy + 66} 78 ${hy + 70} L74 ${hy + 40} Z`} />
            </>
          )}
          {style === 'topknot' && (
            <>
              <path d={`M21 ${hy + 30} C21 ${hy + 4} 34 ${hy - 3} 50 ${hy - 3} C66 ${hy - 3} 79 ${hy + 4} 79 ${hy + 30} C76 ${hy + 27} 66 ${hy + 26} 50 ${hy + 26} C34 ${hy + 26} 24 ${hy + 27} 21 ${hy + 30} Z`} />
              <circle cx="50" cy={hy - 8} r="8" />
            </>
          )}
        </g>
      </g>

      {/* outline last */}
      <path d={HEAD[genes.faceShape] ?? HEAD[0]} fill="none" stroke={shade(skin, 0.7)} strokeWidth="1.1" />
    </svg>
  );
}
