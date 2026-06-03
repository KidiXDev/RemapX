import { Button } from '@/components/common/button';
import { Dialog } from '@/components/common/dialog';
import {
  FormControl,
  FormFieldProvider,
  FormItem,
  FormLabel,
  FormMessage,
  zodValidate
} from '@/components/common/form';
import { Input } from '@/components/common/input';
import { useToast } from '@/components/common/toast';
import { useSettingsStore } from '@/hooks/use-settings-store';
import { useForm } from '@tanstack/react-form';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

interface ProfileDialogsProps {
  createDisclosure: { isOpen: boolean; onClose: () => void };
  renameDisclosure: { isOpen: boolean; onClose: () => void };
  duplicateDisclosure: { isOpen: boolean; onClose: () => void };
  activeProfileName: string;
}

export function ProfileDialogs({
  createDisclosure,
  renameDisclosure,
  duplicateDisclosure,
  activeProfileName
}: ProfileDialogsProps) {
  const { t } = useTranslation('remap');
  const toast = useToast();
  const {
    profiles,
    createProfile,
    renameProfile,
    duplicateProfile,
    setActiveProfile
  } = useSettingsStore();

  const createForm = useForm({
    defaultValues: {
      name: ''
    },
    onSubmit: async ({ value }) => {
      const name = value.name.trim();
      try {
        await createProfile(name);
        toast.success(t('profile.toastCreateSuccess'));
        createForm.reset();
        createDisclosure.onClose();
      } catch (err) {
        console.error(err);
        toast.error(t('profile.toastCreateError'));
      }
    }
  });

  const renameForm = useForm({
    defaultValues: {
      name: ''
    },
    onSubmit: async ({ value }) => {
      const name = value.name.trim();
      try {
        await renameProfile(activeProfileName, name);
        toast.success(t('profile.toastRenameSuccess'));
        renameDisclosure.onClose();
        renameForm.reset();
      } catch (err) {
        console.error(err);
        toast.error(t('profile.toastRenameError'));
      }
    }
  });

  const duplicateForm = useForm({
    defaultValues: {
      name: ''
    },
    onSubmit: async ({ value }) => {
      const name = value.name.trim();
      try {
        await duplicateProfile(activeProfileName, name);
        await setActiveProfile(name);
        toast.success(t('profile.toastDuplicateSuccess'));
        duplicateDisclosure.onClose();
        duplicateForm.reset();
      } catch (err) {
        console.error(err);
        toast.error(t('profile.toastDuplicateError'));
      }
    }
  });

  // Pre-fill profile name values when dialogs are opened
  useEffect(() => {
    if (renameDisclosure.isOpen) {
      renameForm.setFieldValue('name', activeProfileName);
    }
  }, [renameDisclosure.isOpen, activeProfileName]);

  useEffect(() => {
    if (duplicateDisclosure.isOpen) {
      duplicateForm.setFieldValue('name', `${activeProfileName} Copy`);
    }
  }, [duplicateDisclosure.isOpen, activeProfileName]);

  return (
    <>
      {/* Create Profile Dialog */}
      <Dialog
        open={createDisclosure.isOpen}
        onClose={() => {
          createDisclosure.onClose();
          createForm.reset();
        }}
        title={t('profile.createTitle')}
        className="max-w-md border-border-main/70"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            createForm.handleSubmit();
          }}
          className="space-y-6"
        >
          <createForm.Field
            name="name"
            validators={{
              onChange: zodValidate(
                z
                  .string()
                  .trim()
                  .min(1, t('profile.validationRequired'))
                  .refine(
                    (val) =>
                      !profiles.some(
                        (p) => p.name.toLowerCase() === val.toLowerCase()
                      ),
                    t('profile.validationExists')
                  )
              )
            }}
            children={(field) => (
              <FormFieldProvider field={field}>
                <FormItem>
                  <FormLabel>{t('profile.createPlaceholder')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('profile.createPlaceholder')}
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormFieldProvider>
            )}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                createDisclosure.onClose();
                createForm.reset();
              }}
              className="px-4 py-2 text-xs"
            >
              {t('profile.cancel')}
            </Button>
            <createForm.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit, isSubmitting]) => (
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!canSubmit || isSubmitting}
                  className="px-4 py-2 text-xs"
                >
                  {isSubmitting ? '...' : t('profile.create')}
                </Button>
              )}
            />
          </div>
        </form>
      </Dialog>

      {/* Rename Profile Dialog */}
      <Dialog
        open={renameDisclosure.isOpen}
        onClose={() => {
          renameDisclosure.onClose();
          renameForm.reset();
        }}
        title={t('profile.renameTitle')}
        className="max-w-md border-border-main/70"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            renameForm.handleSubmit();
          }}
          className="space-y-6"
        >
          <renameForm.Field
            name="name"
            validators={{
              onChange: zodValidate(
                z
                  .string()
                  .trim()
                  .min(1, t('profile.validationRequired'))
                  .refine(
                    (val) =>
                      val === activeProfileName ||
                      !profiles.some(
                        (p) => p.name.toLowerCase() === val.toLowerCase()
                      ),
                    t('profile.validationExists')
                  )
                  .refine(
                    (val) => val !== activeProfileName,
                    t('profile.validationSameName')
                  )
              )
            }}
            children={(field) => (
              <FormFieldProvider field={field}>
                <FormItem>
                  <FormLabel>{t('profile.renamePlaceholder')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('profile.renamePlaceholder')}
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormFieldProvider>
            )}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                renameDisclosure.onClose();
                renameForm.reset();
              }}
              className="px-4 py-2 text-xs"
            >
              {t('profile.cancel')}
            </Button>
            <renameForm.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit, isSubmitting]) => (
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!canSubmit || isSubmitting}
                  className="px-4 py-2 text-xs"
                >
                  {isSubmitting ? '...' : t('profile.save')}
                </Button>
              )}
            />
          </div>
        </form>
      </Dialog>

      {/* Duplicate Profile Dialog */}
      <Dialog
        open={duplicateDisclosure.isOpen}
        onClose={() => {
          duplicateDisclosure.onClose();
          duplicateForm.reset();
        }}
        title={t('profile.duplicateTitle')}
        className="max-w-md border-border-main/70"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            duplicateForm.handleSubmit();
          }}
          className="space-y-6"
        >
          <duplicateForm.Field
            name="name"
            validators={{
              onChange: zodValidate(
                z
                  .string()
                  .trim()
                  .min(1, t('profile.validationRequired'))
                  .refine(
                    (val) =>
                      !profiles.some(
                        (p) => p.name.toLowerCase() === val.toLowerCase()
                      ),
                    t('profile.validationExists')
                  )
              )
            }}
            children={(field) => (
              <FormFieldProvider field={field}>
                <FormItem>
                  <FormLabel>{t('profile.duplicatePlaceholder')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('profile.duplicatePlaceholder')}
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormFieldProvider>
            )}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                duplicateDisclosure.onClose();
                duplicateForm.reset();
              }}
              className="px-4 py-2 text-xs"
            >
              {t('profile.cancel')}
            </Button>
            <duplicateForm.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit, isSubmitting]) => (
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!canSubmit || isSubmitting}
                  className="px-4 py-2 text-xs"
                >
                  {isSubmitting ? '...' : t('profile.duplicate')}
                </Button>
              )}
            />
          </div>
        </form>
      </Dialog>
    </>
  );
}
