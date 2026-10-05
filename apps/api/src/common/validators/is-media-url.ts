import { ValidateBy, ValidationOptions, isURL } from 'class-validator';

/** Files stored in apps/api/uploads are served as same-origin paths. */
const LOCAL_UPLOAD =
  /^\/uploads\/(?:menus|workers|inventory|branding)\/[0-9a-f-]{36}\.(?:jpg|png|webp|mp4|mov)$/;

export function IsMediaUrl(validationOptions?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isMediaUrl',
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' &&
          (LOCAL_UPLOAD.test(value) || isURL(value)),
        defaultMessage: () => '$property must be a URL address',
      },
    },
    validationOptions,
  );
}
