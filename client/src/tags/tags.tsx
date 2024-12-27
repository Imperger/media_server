import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { Box, IconButton } from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';

import AddTagDialog from './add-tag-dialog';
import { DeleteConfirmTagDialog } from './delete-confirm-tag-dialog';
import RenameTagDialog from './rename-tag-dialog';
import {
  mergeWithTagTree,
  unmergeWithTagTree
} from './tag-tree-transformation';
import styles from './tags.module.css';

import { ApiService } from '@/api-service/api-service';
import { OnTagUpdate, TagUpdateEvent } from '@/api-service/live-feed';
import { MetaInfoService, Tag, TagStyle } from '@/api-service/meta-info';
import { Inversify } from '@/inversify';
import { ArrayHelper } from '@/lib/ArrayHelper';
import { TagTree } from '@/lib/components/tag-tree/tag-tree';
import { dotArrayToTree } from '@/lib/dot-array-to-tree';

function tagPrefix(tag: string): string {
  const prefixEnd = tag.lastIndexOf('.');
  return prefixEnd !== -1 ? tag.substring(0, prefixEnd + 1) : '';
}

const api = Inversify.get(ApiService);
const metaInfo = Inversify.get(MetaInfoService);

export default function Tags() {
  const [selectedTag, setSelectedTag] = useState('');
  const [isAddTagDlgOpen, setIsAddTagDlgOpen] = useState(false);
  const [isRenameDlgOpen, setIsRenameDlgOpen] = useState(false);
  const [isDeleteConfirmDlgOpen, setIsDeleteConfirmDlgOpen] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagTree, setTagTree] = useState<TagTree>({});
  const onTagUpdateRef = useRef<OnTagUpdate>(() => 0);

  const selectedTagPrefix = useMemo(
    () => tagPrefix(selectedTag),
    [selectedTag]
  );

  const onAddTagApply = async (tag: string, style: TagStyle) => {
    await metaInfo.createTag(tag, style);
  };

  const onRenameTagApply = async (newName: string) => {
    await metaInfo.updateTag(selectedTag, { name: newName });
  };

  const onDeleteTagConfirm = async () => {
    const deleted = await metaInfo.deleteTag(selectedTag);

    if (deleted) {
      setSelectedTag('');
    }
  };

  const deleteDisabled = selectedTag === '';

  useEffect(() => {
    const fetchTagTree = async () => {
      const tags = await metaInfo.listAllTags();

      setTags(tags);
      setTagTree(dotArrayToTree(tags, (x) => x.tag));
    };
    fetchTagTree();
  }, []);

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
        setTags(ArrayHelper.discardFirst(tags, (x) => x.tag === e.name));

        if (selectedTag === e.name) {
          setSelectedTag('');
        }

        break;
    }
  };

  useEffect(() => {
    api.liveFeed.subscribe<TagUpdateEvent>('tag.update', (e: TagUpdateEvent) =>
      onTagUpdateRef.current(e)
    );

    return () => void api.liveFeed.unsubscribe('tag.update');
  }, []);

  return (
    <>
      <Box className={styles.tagComponent}>
        <TagTree
          tree={tagTree}
          tagsStyle={tags}
          itemComponent={({ label }) => (
            <Box
              sx={{ display: 'inline', fontWeight: 'bold', fontSize: '2em' }}
            >
              {label}
            </Box>
          )}
          onSelect={(tag: string) => setSelectedTag(tag)}
          sx={{ flex: '1 1 auto', maxHeight: 'calc(100% - 40px)' }}
        />
        <Box className={styles.tagEditControls}>
          <IconButton onClick={() => setIsAddTagDlgOpen(true)}>
            <AddIcon />
          </IconButton>
          <IconButton onClick={() => setIsRenameDlgOpen(true)}>
            <EditIcon />
          </IconButton>
          <IconButton
            onClick={() => setIsDeleteConfirmDlgOpen(true)}
            disabled={deleteDisabled}
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      </Box>
      <AddTagDialog
        key={selectedTagPrefix}
        open={isAddTagDlgOpen}
        setOpen={setIsAddTagDlgOpen}
        tagPrefixPlaceholder={selectedTagPrefix}
        onApply={onAddTagApply}
      />
      <RenameTagDialog
        key={`r_${selectedTag}`}
        open={isRenameDlgOpen}
        setOpen={setIsRenameDlgOpen}
        oldName={selectedTag}
        onApply={onRenameTagApply}
      />
      <DeleteConfirmTagDialog
        key={`d_${selectedTag}`}
        tag={selectedTag}
        open={isDeleteConfirmDlgOpen}
        setOpen={setIsDeleteConfirmDlgOpen}
        onOk={onDeleteTagConfirm}
      />
    </>
  );
}
