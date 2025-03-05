import { Box, Stack } from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  FragmentTagTracksBuilder,
  Tag,
  TagStripe
} from './fragment-tag-tracks-builder';
import styles from './fragment-tag-tracks.module.css';

import { TagStyle } from '@/api-service/meta-info';
import { TagParser } from '@/lib/tag-parser';

export interface FragmentTag {
  id: number;
  name: string;
  begin: number;
  end: number;
  style: TagStyle;
}

function trackKey(track: TagStripe<FragmentTag>): string {
  return track.reduce((acc, x) => `${acc};${x.id}`, '');
}

type Condition = () => boolean;
async function waitUntil(condition: Condition) {
  while (!condition()) {
    await new Promise<void>((resolve) => setTimeout(resolve));
  }
}

export interface FragmentTagTracksProps {
  tags: FragmentTag[];
  playTimeNormal: number;
  isPlaying: boolean;
  duration: number;
  onSelected: (tag: FragmentTag) => void;
}

export function FragmentTagTracks({
  tags,
  playTimeNormal,
  isPlaying,
  duration,
  onSelected
}: FragmentTagTracksProps) {
  const stripRef = useRef<HTMLElement>(null);
  const [selected, setSelected] = useState<FragmentTag | null>(null);
  const tracks = useMemo(() => FragmentTagTracksBuilder.build(tags), [tags]);

  const onTagClick = (tag: FragmentTag) => {
    setSelected(tag);
    onSelected(tag);
  };

  const tagStyle = (tag: FragmentTag) =>
    `${styles.tag} ${tag === selected && styles.tagSelected}`;

  const pixelsPerSecond = 10;
  const tagX = (begin: number) => begin * pixelsPerSecond;

  const tagWidth = (tag: Tag) => (tag.end - tag.begin) * pixelsPerSecond;

  const trackWidth = duration * pixelsPerSecond;

  useEffect(() => {
    let id = -1;

    if (stripRef.current === null) {
      return;
    }

    const strip = stripRef.current;

    if (isPlaying) {
      let prevTimestamp = (document.timeline.currentTime as number | null) ?? 0;

      const imageStripWidth = strip.scrollWidth - strip.clientWidth;

      const speed = imageStripWidth / duration;

      let timeOffset = 0;
      const stripTransition = (timestamp: number) => {
        const elapsed = timestamp - prevTimestamp;
        prevTimestamp = timestamp;

        if (stripRef.current === null) {
          return;
        }

        const left = playTimeNormal * imageStripWidth + timeOffset;
        timeOffset += speed * (elapsed / 1000);

        stripRef.current.scrollTo({ left });

        id = requestAnimationFrame(stripTransition);
      };

      id = requestAnimationFrame(stripTransition);
    } else {
      const deferedScroll = async () => {
        await waitUntil(() => {
          if (stripRef.current === null) {
            return false;
          }

          const strip = stripRef.current;

          return strip.scrollWidth - strip.clientWidth > 0;
        });

        if (stripRef.current === null) {
          return;
        }

        const strip = stripRef.current;
        const imageStripWidth = strip.scrollWidth - strip.clientWidth;

        stripRef.current.scrollTo({ left: playTimeNormal * imageStripWidth });
      };
      deferedScroll();
    }

    return () => {
      if (id !== -1) {
        cancelAnimationFrame(id);
      }
    };
  }, [isPlaying, playTimeNormal]);

  return (
    <Box ref={stripRef} className={styles.tracksComponent}>
      <Box style={{ width: trackWidth }} className={styles.tracks}>
        {tracks.map((track) => (
          <Stack
            key={trackKey(track)}
            direction={'row'}
            className={styles.track}
          >
            {track.map((fragment) => (
              <Box
                key={fragment.id}
                onClick={() => onTagClick(fragment)}
                className={tagStyle(fragment)}
                style={{
                  left: tagX(fragment.begin),
                  width: tagWidth(fragment),
                  color: fragment.style.fontColor,
                  backgroundColor: fragment.style.backgroundColor
                }}
              >
                {TagParser.label(fragment.name)}
              </Box>
            ))}
          </Stack>
        ))}
      </Box>
      <Box className={styles.currentTimeCursor} />
    </Box>
  );
}
