import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested
} from 'class-validator';

import { IsContentPath } from '@/lib/class-validator/is-content-path';

export enum QueryType {
  text = 'text',
  regex = 'regex'
}

export class QueryDto {
  @IsEnum(QueryType)
  readonly type: QueryType;

  @IsString()
  readonly query: string;
}

export enum AttributeType {
  duration = 'duration',
  size = 'size',
  resolution = 'resolution'
}

class AttributeDto {
  @IsEnum(AttributeType)
  readonly type: AttributeType;
}

export enum DurationCondition {
  less = 'less',
  greater = 'greater'
}

class DurationAttributeDto extends AttributeDto {
  declare readonly type: AttributeType.duration;

  @IsEnum(DurationCondition)
  readonly condition: DurationCondition;

  @IsInt()
  @Min(0)
  readonly duration: number;
}

export enum SizeCondition {
  less = 'less',
  greater = 'greater'
}

class SizeAttributeDto extends AttributeDto {
  declare readonly type: AttributeType.size;

  @IsEnum(SizeCondition)
  readonly condition: SizeCondition;

  @IsInt()
  @Min(0)
  readonly size: number;
}
export enum ResolutionCondition {
  less = 'less',
  less_equal = 'less_equal',
  equal = 'equal',
  greater_equal = 'greater_equal',
  greater = 'greater'
}

class ResolutionAttributeDto extends AttributeDto {
  declare readonly type: AttributeType.resolution;

  @IsEnum(ResolutionCondition)
  readonly condition: ResolutionCondition;

  @IsInt()
  @Min(0)
  readonly width: number;

  @IsInt()
  @Min(0)
  readonly height: number;
}

export class SearchRequestDto {
  @IsOptional()
  @Type(() => QueryDto)
  @ValidateNested()
  readonly query?: QueryDto;

  @IsOptional()
  @IsContentPath({ message: 'the path property is not a content path' })
  readonly path?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  readonly tags?: string[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AttributeDto, {
    keepDiscriminatorProperty: true,
    discriminator: {
      property: 'type',
      subTypes: [
        { value: DurationAttributeDto, name: 'duration' },
        { value: SizeAttributeDto, name: 'size' },
        { value: ResolutionAttributeDto, name: 'resolution' }
      ]
    }
  })
  readonly attributes?: (
    | DurationAttributeDto
    | SizeAttributeDto
    | ResolutionAttributeDto
  )[];
}
