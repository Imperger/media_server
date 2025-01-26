import {
  TextFields as TextFieldsIcon,
  Tag as TagIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import { useState, MouseEvent, useMemo, useRef, useEffect } from 'react';
import { useLocation, Location, useNavigate } from 'react-router-dom';
import { match } from 'ts-pattern';
import { useDebounce } from 'use-debounce';

import DurationAttribute, {
  DurationAttributeProps
} from './duration-attribute';
import ResolutionAttribute, {
  Resolution,
  ResolutionAttributeProps
} from './resolution-attribute';
import SizeAttribute, { SizeAttributeProps } from './size-attribute';

import { ApiService } from '@/api-service/api-service';
import { OnTagUpdate, TagUpdateEvent } from '@/api-service/live-feed';
import { Tag } from '@/api-service/meta-info';
import {
  SearchRequest,
  DurationAttribute as DurationAttributeParam,
  SizeAttribute as SizeAttributeParam,
  ResolutionAttribute as ResolutionAttributeParam,
  SearchResult
} from '@/api-service/search.-service';
import { AddTagDialog } from '@/apps/tag/add-tag-dialog';
import FileCard from '@/collection/file-card';
import { Inversify } from '@/inversify';
import { useTitle } from '@/layout/title-context';
import { ArrayHelper } from '@/lib/array-helper';
import { less } from '@/lib/comparator';
import ContentList from '@/lib/components/content-list/content-list';
import RegexIcon from '@/lib/components/icons/regex-icon';
import { TagTree } from '@/lib/components/tag-tree/tag-tree';
import { dotArrayToTree } from '@/lib/dot-array-to-tree';
import { AsyncExceptionTrap } from '@/lib/exception-trap';
import { TagParser } from '@/lib/tag-parser';
import { toBytes, toSeconds } from '@/search/conversion';
import {
  mergeWithTagTree,
  unmergeWithTagTree
} from '@/tags/tag-tree-transformation';

interface LocationState {
  searchPath: string;
}

type QueryType = 'text' | 'regex';

interface DurationAttributeState {
  id: number;
  type: 'duration';
  data: Pick<DurationAttributeProps, 'duration' | 'unit' | 'condition'>;
}

interface SizeAttributeState {
  id: number;
  type: 'size';
  data: Pick<SizeAttributeProps, 'size' | 'unit' | 'condition'>;
}

interface ResolutionAttributeState {
  id: number;
  type: 'resolution';
  data: Pick<
    ResolutionAttributeProps,
    'availableResolutions' | 'selectedResolution' | 'condition'
  >;
}

type AttributeState =
  | DurationAttributeState
  | SizeAttributeState
  | ResolutionAttributeState;

function attributeStateGuard<
  T extends AttributeState,
  TType extends AttributeState['type']
>(x: T, type: TType): x is T & { type: TType } {
  return x.type === type;
}

function makeAttributeUpdater<TAttributeState extends AttributeState>(
  setter: React.Dispatch<React.SetStateAction<AttributeState[]>>,
  attributes: AttributeState[],
  thisData: TAttributeState['data']
) {
  return <TPropName extends keyof TAttributeState['data']>(
      propertyName: TPropName
    ) =>
    (propertyValue: TAttributeState['data'][TPropName]) => {
      {
        const thisIdx = attributes.findIndex((x) => x.data === thisData);

        const updated = {
          id: attributes[thisIdx].id,
          type: attributes[thisIdx].type,
          data: { ...attributes[thisIdx].data, [propertyName]: propertyValue }
        } as AttributeState;

        setter([
          ...attributes.slice(0, thisIdx),
          updated,
          ...attributes.slice(thisIdx + 1)
        ]);
      }
    };
}

interface DurationAttributeSerialized
  extends Pick<DurationAttributeProps, 'duration' | 'unit' | 'condition'> {
  type: 'duration';
}

interface SizeAttributeSerialized
  extends Pick<SizeAttributeProps, 'size' | 'unit' | 'condition'> {
  type: 'size';
}

interface ResolutionAttributeSerialized
  extends Pick<ResolutionAttributeProps, 'selectedResolution' | 'condition'> {
  type: 'resolution';
}

type SerializedAttribute =
  | DurationAttributeSerialized
  | SizeAttributeSerialized
  | ResolutionAttributeSerialized;

const api = Inversify.get(ApiService);

export default function Search() {
  const { setTitle } = useTitle();
  const navigate = useNavigate();
  const location: Location<LocationState> = useLocation();
  const searchParams = new URLSearchParams(location.search);

  const [queryType, setQueryType] = useState<QueryType>(
    match(searchParams.get('queryType'))
      .with('text', () => 'text' as const)
      .with('regex', () => 'regex' as const)
      .otherwise(() => 'text' as const)
  );

  const [query, setQuery] = useState(searchParams.get('query') ?? '');

  const [path, setPath] = useState(
    decodeURI(searchParams.get('path') ?? location.state?.searchPath ?? '')
  );

  const [attachedTags, setAttachedTags] = useState<string[]>(
    JSON.parse(searchParams.get('tags') ?? '[]')
  );

  const [tagTree, setTagTree] = useState<TagTree>({});
  const [tags, setTags] = useState<Tag[]>([]);
  const onTagUpdateRef = useRef<OnTagUpdate>(() => 0);
  const [addTagDialogOpen, setAddTagDialogOpen] = useState(false);

  const [attributesMenuAnchor, setAttributesMenuAnchor] =
    useState<HTMLElement | null>(null);

  const [availableResolutions, setAvailableResolutions] = useState<
    Resolution[]
  >(JSON.parse(searchParams.get('availableResolutions') ?? '[]'));

  const nextAttributeKey = useRef(0);

  const [attributes, setAttributes] = useState<AttributeState[]>(
    (
      JSON.parse(
        searchParams.get('attributes') ?? '[]'
      ) as SerializedAttribute[]
    ).map((x) =>
      match(x)
        .with(
          { type: 'size' },
          (x) =>
            ({
              id: nextAttributeKey.current++,
              type: 'size' as const,
              data: { condition: x.condition, size: x.size, unit: x.unit }
            }) satisfies SizeAttributeState
        )
        .with(
          { type: 'duration' },
          (x) =>
            ({
              id: nextAttributeKey.current++,
              type: 'duration' as const,
              data: {
                condition: x.condition,
                duration: x.duration,
                unit: x.unit
              }
            }) satisfies DurationAttributeState
        )
        .with(
          { type: 'resolution' },
          (x) =>
            ({
              id: nextAttributeKey.current++,
              type: 'resolution',
              data: {
                availableResolutions,
                condition: x.condition,
                selectedResolution: x.selectedResolution
              }
            }) satisfies ResolutionAttributeState
        )
        .exhaustive()
    )
  );

  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);

  const sortedAvailableResolutions = useMemo(
    () =>
      availableResolutions.sort(
        (a, b) =>
          less(+(a.width > a.height), +(b.width > b.height)) ||
          less(a.width, b.width) ||
          less(a.height, b.height)
      ),
    [availableResolutions]
  );

  const onQueryTypeChange = (_e: MouseEvent<HTMLElement>, type: QueryType) =>
    type && setQueryType(type);

  const sortedTags = useMemo(
    () =>
      attachedTags.sort((a, b) =>
        less(TagParser.label(a.toLowerCase()), TagParser.label(b.toLowerCase()))
      ),
    [attachedTags]
  );

  const onAddTag = async (tag: string) => {
    setAttachedTags([...attachedTags, tag]);
  };

  const onRemoveTag = async (tag: string) => {
    setAttachedTags(attachedTags.filter((x) => x !== tag));
  };

  const detachedTagTree = useMemo(
    () =>
      attachedTags.reduce(
        (tree, tag) => unmergeWithTagTree(tag, tree),
        tagTree
      ),
    [attachedTags, tagTree]
  );

  useEffect(() => {
    const fetchAllTags = async () => {
      const tags = await api.metaInfo.listAllTags();

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

        break;
    }
  };

  const onAddTagDialogOpen = () => setAddTagDialogOpen(true);

  const isAttributesMenuOpen = Boolean(attributesMenuAnchor);

  const onOpenAttributesMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAttributesMenuAnchor(event.currentTarget);
  };

  const onCloseAttributesMenu = () => setAttributesMenuAnchor(null);

  const onAddDurationAttribute = () => {
    setAttributes([
      ...attributes,
      {
        id: nextAttributeKey.current++,
        type: 'duration',
        data: { duration: 0, unit: 'minute', condition: 'greater' }
      }
    ]);

    onCloseAttributesMenu();
  };

  const onAddSizeAttribute = () => {
    setAttributes([
      ...attributes,
      {
        id: nextAttributeKey.current++,
        type: 'size',
        data: { size: 0, unit: 'megabyte', condition: 'greater' }
      }
    ]);

    onCloseAttributesMenu();
  };

  const onAddResolutionAttribute = () => {
    setAttributes([
      ...attributes,
      {
        id: nextAttributeKey.current++,
        type: 'resolution',
        data: {
          availableResolutions: sortedAvailableResolutions,
          selectedResolution: sortedAvailableResolutions[0],
          condition: 'greater'
        }
      }
    ]);

    onCloseAttributesMenu();
  };

  const removeAttribute = (id: number) => () =>
    setAttributes(ArrayHelper.discardFirst(attributes, (x) => x.id === id));

  const searchRequest: SearchRequest = useMemo(() => {
    const mappedAttributes = attributes.flatMap((x) => {
      if (attributeStateGuard(x, 'duration')) {
        return {
          type: 'duration',
          duration: toSeconds(x.data.duration, x.data.unit),
          condition: x.data.condition
        } satisfies DurationAttributeParam;
      } else if (attributeStateGuard(x, 'size')) {
        return {
          type: 'size',
          size: toBytes(x.data.size, x.data.unit),
          condition: x.data.condition
        } satisfies SizeAttributeParam;
      } else if (attributeStateGuard(x, 'resolution')) {
        return {
          type: 'resolution',
          width: x.data.selectedResolution.width,
          height: x.data.selectedResolution.height,
          condition: x.data.condition
        } satisfies ResolutionAttributeParam;
      }

      return [];
    });

    return {
      ...(query.length && { query: { type: queryType, query } }),
      ...(path.length && { path }),
      ...(attachedTags.length && { tags: attachedTags }),
      ...(attributes.length && { attributes: mappedAttributes })
    };
  }, [attachedTags, attributes, path, query, queryType]);

  const truncatedSearchResult = useMemo(
    () => searchResult?.items.slice(0, 100) ?? [],
    [searchResult]
  );

  const [debouncedSearchRequest] = useDebounce(searchRequest, 100);

  useEffect(() => {
    const search = async () => {
      if (Object.keys(debouncedSearchRequest).length === 0) {
        setTitle('Search');
        setSearchResult(null);
        return;
      }

      const searchResult = await api.search.search(debouncedSearchRequest);

      setSearchResult(searchResult);
      setTitle(`Search | ${searchResult.total}`);
    };
    search();
  }, [debouncedSearchRequest]);

  useEffect(() => {
    setTitle('Search');

    const fetchAvailableResolutions = async () => {
      const resolutions = await AsyncExceptionTrap.Try(() =>
        api.search.availableResolutions()
      ).CatchValue([]);

      setAvailableResolutions(resolutions);
    };
    fetchAvailableResolutions();
  }, []);

  useEffect(() => {
    const params: string[] = [];

    if (query) {
      params.push(`query=${query}&queryType=${queryType}`);
    }

    if (path) {
      params.push(`path=${path}`);
    }

    if (attachedTags.length > 0) {
      params.push(`tags=${JSON.stringify(attachedTags)}`);
    }

    if (attributes.length > 0) {
      const serializedAttrs: SerializedAttribute[] = attributes.map((x) =>
        match(x)
          .with({ type: 'size' }, (x) => ({ type: 'size' as const, ...x.data }))
          .with({ type: 'duration' }, (x) => ({
            type: 'duration' as const,
            ...x.data
          }))
          .with({ type: 'resolution' }, (x) => ({
            type: 'resolution' as const,
            ...x.data,
            availableResolutions: undefined
          }))
          .exhaustive()
      );

      params.push(`attributes=${JSON.stringify(serializedAttrs)}`);
    }

    if (attributes.some((x) => x.type === 'resolution')) {
      params.push(
        `availableResolutions=${JSON.stringify(availableResolutions)}`
      );
    }

    navigate(`?${params.join('&')}`, { replace: true });
  }, [query, queryType, path, attachedTags, attributes]);

  return (
    <>
      <Stack
        direction="column"
        alignItems="center"
        sx={{ overflowY: 'auto', height: '100%' }}
      >
        <Box>
          <Stack direction="row">
            <TextField
              label="Search"
              variant="standard"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <ToggleButtonGroup
              value={queryType}
              onChange={onQueryTypeChange}
              exclusive
            >
              <ToggleButton value="text">
                <TextFieldsIcon />
              </ToggleButton>
              <ToggleButton value="regex">
                <RegexIcon />
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>
          <TextField
            label="Path"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            style={{ margin: '10px 0' }}
          />
        </Box>
        <Button onClick={onAddTagDialogOpen}>
          <TagIcon />
          Add tag
        </Button>
        <Box>
          {sortedTags.map((t) => (
            <Chip
              key={t}
              label={TagParser.label(t)}
              onDelete={() => onRemoveTag(t)}
              sx={{ margin: '2px' }}
            />
          ))}
        </Box>
        <Button onClick={onOpenAttributesMenu}>Add attribute</Button>
        <Menu
          anchorEl={attributesMenuAnchor}
          open={isAttributesMenuOpen}
          onClose={onCloseAttributesMenu}
        >
          <MenuItem onClick={onAddResolutionAttribute}>Resolution</MenuItem>
          <MenuItem onClick={onAddDurationAttribute}>Duration</MenuItem>
          <MenuItem onClick={onAddSizeAttribute}>Size</MenuItem>
        </Menu>
        <Box>
          {attributes.map((attr) => {
            if (attributeStateGuard(attr, 'duration')) {
              const updateAttribute =
                makeAttributeUpdater<DurationAttributeState>(
                  setAttributes,
                  attributes,
                  attr.data
                );

              return (
                <Stack
                  key={attr.id}
                  direction="row"
                  justifyContent="space-between"
                >
                  <DurationAttribute
                    duration={attr.data.duration}
                    setDuration={updateAttribute('duration')}
                    unit={attr.data.unit}
                    setUnit={updateAttribute('unit')}
                    condition={attr.data.condition}
                    setCondition={updateAttribute('condition')}
                  />
                  <IconButton onClick={removeAttribute(attr.id)}>
                    <ClearIcon />
                  </IconButton>
                </Stack>
              );
            } else if (attributeStateGuard(attr, 'size')) {
              const updateAttribute = makeAttributeUpdater<SizeAttributeState>(
                setAttributes,
                attributes,
                attr.data
              );

              return (
                <Stack
                  key={attr.id}
                  direction="row"
                  justifyContent="space-between"
                >
                  <SizeAttribute
                    size={attr.data.size}
                    setSize={updateAttribute('size')}
                    unit={attr.data.unit}
                    setUnit={updateAttribute('unit')}
                    condition={attr.data.condition}
                    setCondition={updateAttribute('condition')}
                  />
                  <IconButton onClick={removeAttribute(attr.id)}>
                    <ClearIcon />
                  </IconButton>
                </Stack>
              );
            } else if (attributeStateGuard(attr, 'resolution')) {
              const updateAttribute =
                makeAttributeUpdater<ResolutionAttributeState>(
                  setAttributes,
                  attributes,
                  attr.data
                );

              return (
                <Stack
                  key={attr.id}
                  direction="row"
                  justifyContent="space-between"
                >
                  <ResolutionAttribute
                    availableResolutions={attr.data.availableResolutions}
                    selectedResolution={attr.data.selectedResolution}
                    setSelectedResolution={updateAttribute(
                      'selectedResolution'
                    )}
                    condition={attr.data.condition}
                    setCondition={updateAttribute('condition')}
                  />
                  <IconButton onClick={removeAttribute(attr.id)}>
                    <ClearIcon />
                  </IconButton>
                </Stack>
              );
            }

            return null;
          })}
        </Box>
        <ContentList>
          {truncatedSearchResult.map((x) => {
            return (
              <FileCard
                key={x.filename}
                filename={x.filename}
                size={x.size}
                duration={x.duration}
                width={x.width}
                height={x.height}
                assetPrefix={x.assetPrefix}
                createdAt={x.createdAt}
                onDelete={() => 0}
                onRename={() => 0}
                onCache={() => 0}
                isAvailable={true}
                isCached={false}
              />
            );
          })}
        </ContentList>
      </Stack>
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
