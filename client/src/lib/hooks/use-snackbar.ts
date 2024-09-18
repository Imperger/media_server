import {
  EnqueueSnackbar,
  OptionsWithExtraProps,
  ProviderContext,
  SnackbarMessage,
  SnackbarOrigin,
  useSnackbar as useNotistackSnackbar,
  VariantType
} from 'notistack';

const alignTopRoutes = ['/play/', '/play-folder/', '/app/clip'];

export function useSnackbar(): ProviderContext {
  const { enqueueSnackbar: enqueueNotistachSnackbar, closeSnackbar } =
    useNotistackSnackbar();

  const enqueueSnackbar: EnqueueSnackbar = <V extends VariantType>(
    message: SnackbarMessage,
    options?: OptionsWithExtraProps<V>
  ) => {
    const anchorOrigin: SnackbarOrigin = alignTopRoutes.some((x) =>
      location.pathname.startsWith(x)
    )
      ? { horizontal: 'center', vertical: 'top' }
      : { horizontal: 'left', vertical: 'bottom' };

    const tunedOptions: OptionsWithExtraProps<V> = {
      anchorOrigin,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...((options as OptionsWithExtraProps<any>) ?? {})
    };

    return enqueueNotistachSnackbar(message, tunedOptions);
  };

  return { enqueueSnackbar, closeSnackbar };
}
