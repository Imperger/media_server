import { Delete as DeleteIcon } from '@mui/icons-material';
import { IconButton } from '@mui/material';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';

import { AddTagDialog } from './add-tag-dialog';
import { FragmentTagTracks } from './fragment-tag-tracks';

import { ApiService } from '@/api-service/api-service';
import {
  FragmentTagUpdateEvent,
  OnFragmentTagUpdate,
  OnTagUpdate,
  TagUpdateEvent
} from '@/api-service/live-feed';
import { FragmentTag, MetaInfoService, Tag } from '@/api-service/meta-info';
import { Inversify } from '@/inversify';
import { ArrayHelper } from '@/lib/ArrayHelper';
import CloseBracketIcon from '@/lib/components/icons/close-bracket-icon';
import OpenBracketIcon from '@/lib/components/icons/open-bracket-icon';
import { TagTree } from '@/lib/components/tag-tree/tag-tree';
import { dotArrayToTree } from '@/lib/dot-array-to-tree';
import { useSnackbar } from '@/lib/hooks/use-snackbar';
import { RWState } from '@/lib/rw-state';
import { TagParser } from '@/lib/tag-parser';
import {
  mergeWithTagTree,
  unmergeWithTagTree
} from '@/tags/tag-tree-transformation';

interface TagBoundary {
  begin: number;
  end: number;
}

interface SubcategoryTag {
  name: string;
  begin: number;
  end: number;
}

function findFreeSpaceForTag(
  tag: string,
  attachedTags: FragmentTag[],
  insertionPoint: number,
  duration: number,
  minFragmentLength: number
): TagBoundary | null {
  const subcategory = TagParser.subcategory(tag);

  const sameSubcategory: SubcategoryTag[] = attachedTags
    .filter((x) => TagParser.subcategory(x.name) === subcategory)
    .sort((a, b) => a.begin - b.begin);

  if (sameSubcategory.length === 0) {
    return { begin: 0, end: minFragmentLength };
  }

  sameSubcategory.unshift({ begin: 0, end: 0, name: 'before_first' });
  sameSubcategory.push({
    begin: duration,
    end: duration,
    name: 'after_last'
  });
  for (let n = 0; n < sameSubcategory.length - 1; ++n) {
    if (
      sameSubcategory[n + 1].begin - sameSubcategory[n].end >=
        minFragmentLength &&
      insertionPoint >= sameSubcategory[n].end &&
      insertionPoint <= sameSubcategory[n + 1].begin
    ) {
      return {
        begin: insertionPoint,
        end: insertionPoint + minFragmentLength
      };
    }
  }

  return null;
}

function validateCollision(
  tags: FragmentTag[],
  incoming: FragmentTag
): boolean {
  const subcategory = TagParser.subcategory(incoming.name);

  const sameSubcategory = tags.filter(
    (x) => TagParser.subcategory(x.name) === subcategory
  );

  if (sameSubcategory.length === 0) {
    return true;
  }

  for (let n = 0; n < sameSubcategory.length; ++n) {
    const t = sameSubcategory[n];

    if (incoming.begin < t.end && t.begin < incoming.end) {
      return false;
    }
  }

  return true;
}

function updateTagBegin(tag: FragmentTag, begin: number): FragmentTag {
  return begin <= tag.end
    ? { ...tag, begin }
    : { ...tag, begin: tag.end, end: begin };
}

function updateTagEnd(tag: FragmentTag, end: number): FragmentTag {
  return end >= tag.begin
    ? { ...tag, end }
    : { ...tag, end: tag.begin, begin: end };
}

type OnSetFn = () => void;

export interface FragmentTagProps extends RWState<'addTagDialogOpen', boolean> {
  collectionId: number;
  filename: string;
  playerRef: HTMLVideoElement;
  setExtraControls: (controls: ReactNode) => void;
}

const api = Inversify.get(ApiService);
const metaInfo = Inversify.get(MetaInfoService);

export function FragmentTagEditor({
  addTagDialogOpen,
  setAddTagDialogOpen,
  collectionId,
  filename,
  playerRef,
  setExtraControls
}: FragmentTagProps) {
  const minFragmentLength = 10;
  const [attachedTags, setAttachedTags] = useState<FragmentTag[]>([]);
  const [tagTree, setTagTree] = useState<TagTree>({});
  const [tags, setTags] = useState<Tag[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playTime, setPlayTime] = useState(0);
  const [duration, setDuration] = useState(playerRef.duration);
  const [selectedTag, setSelectedTag] = useState('');
  const onTagUpdateRef = useRef<OnTagUpdate>(() => 0);
  const onFragmentTagUpdateRef = useRef<OnFragmentTagUpdate>(() => 0);
  const onSetBeginRef = useRef<OnSetFn>(() => 0);
  const onSetEndRef = useRef<OnSetFn>(() => 0);
  const { enqueueSnackbar } = useSnackbar();

  const onAddTag = async (tag: string) => {
    const tagBoundary = findFreeSpaceForTag(
      tag,
      attachedTags,
      playTime,
      duration,
      minFragmentLength
    );

    if (tagBoundary === null) {
      enqueueSnackbar('Not enough space to place the tag', {
        variant: 'error',
        autoHideDuration: 2000
      });

      return;
    }

    if (
      await metaInfo.attachFileFragmentTag(collectionId, filename, {
        tag,
        ...tagBoundary
      })
    ) {
      const tagDesc = tags.find((x) => x.tag === tag);

      if (tagDesc === undefined) return;

      setAttachedTags([
        ...attachedTags,
        {
          name: tag,
          ...tagBoundary,
          style: {
            fontColor: tagDesc.style.fontColor,
            backgroundColor: tagDesc.style.backgroundColor
          }
        }
      ]);
    }
  };

  onTagUpdateRef.current = (e: TagUpdateEvent) => {
    switch (e.type) {
      case 'add':
        setTagTree(mergeWithTagTree(e.name, { ...tagTree }));
        setTags([...tags, { tag: e.name, style: e.style }]);
        break;
      case 'rename':
        {
          setTagTree(
            mergeWithTagTree(
              e.newName,
              unmergeWithTagTree(e.oldName, { ...tagTree })
            )
          );

          const renamedIdx = tags.findIndex((x) => x.tag === e.oldName);

          if (renamedIdx === -1) return;

          setTags([
            ...tags.slice(0, renamedIdx),
            { ...tags[renamedIdx], tag: e.newName },
            ...tags.slice(renamedIdx + 1)
          ]);
        }
        break;
      case 'delete':
        setTagTree(unmergeWithTagTree(e.name, { ...tagTree }));
        setTags(ArrayHelper.filterFirst(tags, (x) => x.tag !== e.name));

        if (selectedTag === e.name) {
          setSelectedTag('');
        }
        break;
    }
  };

  useEffect(() => {
    const fetchAllTags = async () => {
      const tags = await metaInfo.listAllTags();

      setTags(tags);
      setTagTree(dotArrayToTree(tags, (x) => x.tag));
    };

    if (addTagDialogOpen) {
      api.liveFeed.subscribe<TagUpdateEvent>(
        'tag.update',
        (e: TagUpdateEvent) => onTagUpdateRef.current(e)
      );

      fetchAllTags();

      return () => void api.liveFeed.unsubscribe('tag.update');
    }
  }, [addTagDialogOpen]);

  onFragmentTagUpdateRef.current = (e: FragmentTagUpdateEvent) => {
    switch (e.type) {
      case 'add':
        setAttachedTags([...attachedTags, e]);
        break;
      case 'update':
        {
          const updatedIdx = attachedTags.findIndex((x) => x.name === e.tag);

          setAttachedTags([
            ...attachedTags.slice(0, updatedIdx),
            {
              ...attachedTags[updatedIdx],
              ...(e.begin !== undefined && { begin: e.begin }),
              ...(e.end !== undefined && { end: e.end })
            },
            ...attachedTags.slice(updatedIdx + 1)
          ]);
        }
        break;
      case 'remove':
        setAttachedTags(
          ArrayHelper.filterFirst(attachedTags, (x) => x.name !== e.name)
        );
        break;
    }
  };

  useEffect(() => {
    api.liveFeed.subscribe(
      `tagFileFragment.update_${collectionId}/${filename}`,
      (e: FragmentTagUpdateEvent) => onFragmentTagUpdateRef.current(e)
    );

    const fetchAttachedTags = async () => {
      setAttachedTags(
        await metaInfo.listAttachedFileFragmentTags(collectionId, filename)
      );
    };
    fetchAttachedTags();

    return () =>
      void api.liveFeed.unsubscribe(
        `tagFileFragment.update_${collectionId}/${filename}`
      );
  }, []);

  const detachedTagTree = useMemo(
    () =>
      attachedTags.reduce(
        (tree, tag) => unmergeWithTagTree(tag.name, tree),
        tagTree
      ),
    [attachedTags, tagTree]
  );

  const hasSelectedTag = useMemo(() => selectedTag.length > 0, [selectedTag]);

  const canSetBegin = useMemo(() => {
    const selectedIdx = attachedTags.findIndex((x) => x.name === selectedTag);

    if (selectedIdx === -1) return false;

    return (
      hasSelectedTag &&
      validateCollision(
        [
          ...attachedTags.slice(0, selectedIdx),
          ...attachedTags.slice(selectedIdx + 1)
        ],
        updateTagBegin(attachedTags[selectedIdx], playTime)
      )
    );
  }, [hasSelectedTag, attachedTags, selectedTag, playTime]);

  const canSetEnd = useMemo(() => {
    const selectedIdx = attachedTags.findIndex((x) => x.name === selectedTag);

    if (selectedIdx === -1) return false;

    return (
      hasSelectedTag &&
      validateCollision(
        [
          ...attachedTags.slice(0, selectedIdx),
          ...attachedTags.slice(selectedIdx + 1)
        ],
        updateTagEnd(attachedTags[selectedIdx], playTime)
      )
    );
  }, [hasSelectedTag, attachedTags, selectedTag, playTime]);

  onSetBeginRef.current = async () => {
    const selectedIdx = attachedTags.findIndex((x) => x.name === selectedTag);
    const selected = attachedTags[selectedIdx];

    const editedTag = updateTagBegin(selected, playTime);

    setAttachedTags([
      ...attachedTags.slice(0, selectedIdx),
      editedTag,
      ...attachedTags.slice(selectedIdx + 1)
    ]);

    await metaInfo.updateAttachedFileFragmentTag(collectionId, filename, {
      tag: editedTag.name,
      begin: editedTag.begin,
      end: editedTag.end
    });
  };

  onSetEndRef.current = async () => {
    const selectedIdx = attachedTags.findIndex((x) => x.name === selectedTag);
    const selected = attachedTags[selectedIdx];

    const editedTag = updateTagEnd(selected, playTime);

    setAttachedTags([
      ...attachedTags.slice(0, selectedIdx),
      editedTag,
      ...attachedTags.slice(selectedIdx + 1)
    ]);

    await metaInfo.updateAttachedFileFragmentTag(collectionId, filename, {
      tag: editedTag.name,
      begin: editedTag.begin,
      end: editedTag.end
    });
  };

  const onDelete = async () => {
    if (
      await metaInfo.detachFileFragmentTag(selectedTag, collectionId, filename)
    ) {
      setAttachedTags(
        ArrayHelper.filterFirst(attachedTags, (x) => x.name !== selectedTag)
      );

      setSelectedTag('');
    }
  };

  useEffect(() => {
    setExtraControls(
      <>
        <IconButton
          onClick={() => onSetBeginRef.current()}
          disabled={!canSetBegin}
        >
          <OpenBracketIcon />
        </IconButton>
        <IconButton onClick={() => onSetEndRef.current()} disabled={!canSetEnd}>
          <CloseBracketIcon />
        </IconButton>
        <IconButton onClick={onDelete} disabled={!hasSelectedTag}>
          <DeleteIcon />
        </IconButton>
      </>
    );

    return () => setExtraControls(null);
  }, [canSetBegin, canSetEnd, hasSelectedTag]);

  useEffect(() => {
    setIsPlaying(!playerRef.paused);
    setPlayTime(playerRef.currentTime);

    const onTimeUpdate = () => setPlayTime(playerRef.currentTime);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onAbort = () => setIsPlaying(false);

    const onDurationChange = () => {
      setDuration(playerRef.duration);
    };

    playerRef.addEventListener('timeupdate', onTimeUpdate);
    playerRef.addEventListener('play', onPlay);
    playerRef.addEventListener('pause', onPause);
    playerRef.addEventListener('abort', onAbort);
    playerRef.addEventListener('durationchange', onDurationChange);

    return () => {
      playerRef.removeEventListener('timeupdate', onTimeUpdate);
      playerRef.removeEventListener('play', onPlay);
      playerRef.removeEventListener('pause', onPause);
      playerRef.removeEventListener('abort', onAbort);
      playerRef.removeEventListener('durationchange', onDurationChange);
    };
  }, [playerRef]);

  const playTimeNormal = useMemo(
    () => playTime / duration,
    [playTime, duration]
  );

  return (
    <>
      <FragmentTagTracks
        tags={attachedTags}
        playTimeNormal={playTimeNormal}
        isPlaying={isPlaying}
        duration={duration}
        onSelected={setSelectedTag}
      />
      {addTagDialogOpen && (
        <AddTagDialog
          open={addTagDialogOpen}
          setOpen={setAddTagDialogOpen}
          tagTree={detachedTagTree}
          tags={tags}
          onApply={onAddTag}
        />
      )}
    </>
  );
}
