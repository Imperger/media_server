import { Box } from '@mui/material';
import {
  DefaultComponentProps,
  OverridableTypeMap
} from '@mui/material/OverridableComponent';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useResize } from '@/lib/hooks/use-resize';
import { ImageInfo, imageInfo } from '@/lib/image-info';

interface ScrubbingOverlayProps
  extends DefaultComponentProps<OverridableTypeMap> {
  show: boolean;
  scrubbingStripeUrl: string;
  videoAspectRatio: number;
  currentTimeNormal: number;
}

function scrubbingFrameWidth(
  stripeDimension: ImageInfo,
  originAspectRatio: number
): number {
  const maxDeviation = 50;

  const potentialWidth = Math.round(stripeDimension.height * originAspectRatio);

  if (stripeDimension.width % potentialWidth === 0) {
    return potentialWidth;
  }

  for (let deviation = 1; deviation <= maxDeviation; ++deviation) {
    if (stripeDimension.width % (potentialWidth + deviation) === 0) {
      return potentialWidth + deviation;
    }

    if (stripeDimension.width % (potentialWidth - deviation) === 0) {
      return potentialWidth - deviation;
    }
  }

  return potentialWidth;
}

function ScrubbingOverlay({
  show,
  scrubbingStripeUrl,
  videoAspectRatio,
  currentTimeNormal,
  ...props
}: ScrubbingOverlayProps) {
  const overlayRef = useRef<HTMLElement>(null);

  const [stripeDimension, setStripeDimension] = useState<ImageInfo>({
    width: 0,
    height: 0
  });

  const [frameWidth, setFrameWidth] = useState(0);
  const [framesOnStrip, setFramesOnStrip] = useState(0);
  const windowSize = useResize();

  useEffect(() => {
    const setup = async () =>
      setStripeDimension(await imageInfo(scrubbingStripeUrl));

    if (scrubbingStripeUrl.length > 0) {
      setup();
    }
  }, [scrubbingStripeUrl]);

  useEffect(() => {
    const setup = async () => {
      const frameWidth = scrubbingFrameWidth(stripeDimension, videoAspectRatio);
      const framesOnStrip = Math.floor(stripeDimension.width / frameWidth);

      setStripeDimension(stripeDimension);
      setFrameWidth(frameWidth);
      setFramesOnStrip(framesOnStrip);
    };
    setup();
  }, [stripeDimension, videoAspectRatio, windowSize]);

  const offsetX = useMemo(() => {
    if (overlayRef.current === null) {
      return 0;
    }

    const overlayBoundingRect = overlayRef.current.getBoundingClientRect();
    const frameIdx = Math.ceil(currentTimeNormal * framesOnStrip) - 1;
    const stripScaleFactor =
      overlayBoundingRect.height / stripeDimension.height;

    return Math.ceil(-frameIdx * stripScaleFactor * frameWidth);
  }, [currentTimeNormal, framesOnStrip, frameWidth, stripeDimension]);

  return (
    <Box
      {...props}
      ref={overlayRef}
      sx={{
        overflow: 'clip',
        display: show ? 'block' : 'none',
        ...props.sx
      }}
    >
      <Box
        component="img"
        style={{ position: 'absolute', height: '100%', left: `${offsetX}px` }}
        src={scrubbingStripeUrl}
      ></Box>
    </Box>
  );
}

export default ScrubbingOverlay;
