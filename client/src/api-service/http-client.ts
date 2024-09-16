import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { inject, injectable } from 'inversify';

import { ConfigService } from '@/config';
import { Inversify } from '@/inversify';

@injectable()
export class HttpClient
  implements
    Pick<
      AxiosInstance,
      'get' | 'delete' | 'head' | 'options' | 'post' | 'put' | 'patch'
    >
{
  public readonly axios: AxiosInstance;

  constructor(@inject(ConfigService) config: ConfigService) {
    this.axios = axios.create({ baseURL: config.apiEntry });
  }
  get<T = unknown, R = AxiosResponse<T, unknown>, D = unknown>(
    url: string,
    config?: AxiosRequestConfig<D>
  ): Promise<R> {
    return this.axios.get(url, config);
  }

  delete<T = unknown, R = AxiosResponse<T, unknown>, D = unknown>(
    url: string,
    config?: AxiosRequestConfig<D>
  ): Promise<R> {
    return this.axios.delete(url, config);
  }

  head<T = unknown, R = AxiosResponse<T, unknown>, D = unknown>(
    url: string,
    config?: AxiosRequestConfig<D>
  ): Promise<R> {
    return this.axios.head(url, config);
  }

  options<T = unknown, R = AxiosResponse<T, unknown>, D = unknown>(
    url: string,
    config?: AxiosRequestConfig<D>
  ): Promise<R> {
    return this.axios.options(url, config);
  }

  post<T = unknown, R = AxiosResponse<T, unknown>, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>
  ): Promise<R> {
    return this.axios.post(url, data, config);
  }

  put<T = unknown, R = AxiosResponse<T, unknown>, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>
  ): Promise<R> {
    return this.axios.put(url, data, config);
  }

  patch<T = unknown, R = AxiosResponse<T, unknown>, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>
  ): Promise<R> {
    return this.axios.patch(url, data, config);
  }
}

Inversify.bind(HttpClient).toSelf().inSingletonScope();
