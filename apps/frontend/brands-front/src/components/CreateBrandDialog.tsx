'use client';

import { useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import { FormDialog, LabeledField, LabeledSelect, useToast } from '@repo/ui/ui';
import { useListCategoriesQuery } from '@repo/ui/state';
import { getInitials } from '@repo/ui/utils';
import { useCreateBrandMutation, useUploadLogoForNewBrandMutation } from '../store/api/brands.api';
import { BRAND_TYPE_OPTIONS } from '../lib/mock-data';

interface CreateBrandDialogProps {
  open: boolean;
  onClose: () => void;
}

// name -> slug: minúsculas, sin acentos, espacios/símbolos a guiones. No es
// una librería (`slugify`) a propósito — un caso de uso, una función de 5
// líneas no justifica una dependencia nueva.
const DIACRITICS_REGEX = new RegExp('[̀-ͯ]', 'g'); // marcas diacríticas (acentos) tras NFD

// #RGB o #RRGGBB — mismo formato que ya escribe el input type="color" de al
// lado; el campo de texto es un atajo opcional, pero si se escribe a mano
// debe seguir siendo un hex válido (si no, rompe el bgcolor del Avatar).
const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(DIACRITICS_REGEX, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Primera versión: solo pide lo mínimo para crear la marca y obtener el
// connectUrl de Ayrshare (conectar redes sociales reales). allowedSocial
// fijo a Instagram — todavía no hay picker de redes, el catálogo real solo
// tiene esa por ahora (ver plan "conectar marca y cuenta de Instagram reales").
export function CreateBrandDialog({ open, onClose }: CreateBrandDialogProps) {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [profileType, setProfileType] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('');
  const [connectUrl, setConnectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [createBrand, { isLoading: isCreating }] = useCreateBrandMutation();
  const [uploadLogo, { isLoading: isUploadingLogo }] = useUploadLogoForNewBrandMutation();
  const { data: categories = [] } = useListCategoriesQuery();
  const { showSuccess, showError } = useToast();
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Sube el logo de inmediato (mejor feedback), pero la marca en sí recién
  // se crea al confirmar el formulario — mismo patrón que el logo/avatar en
  // StaffProfileSection/ClientSection.
  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const { logoUrl: uploadedUrl } = await uploadLogo(file).unwrap();
      setLogoUrl(uploadedUrl);
      showSuccess('Logo listo.');
    } catch {
      showError('No se pudo subir el logo.');
    }
  }

  // Bug real (2026-08-20): "Color primario" era texto completamente libre —
  // un valor que no fuera un hex válido rompía silenciosamente el bgcolor
  // del Avatar (CSS ignora un color inválido, se ve como si no hubiera
  // color de fondo). Vacío sigue siendo válido (campo opcional).
  const colorValid = !primaryColor.trim() || HEX_COLOR_REGEX.test(primaryColor.trim());

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function reset() {
    setStep('form');
    setName('');
    setSlug('');
    setSlugTouched(false);
    setProfileType('');
    setCategoryId('');
    setLogoUrl('');
    setPrimaryColor('');
    setConnectUrl(null);
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleCreate() {
    if (!name.trim() || !slug.trim()) return;
    setError(null);
    try {
      const brand = await createBrand({
        name: name.trim(),
        slug: slug.trim(),
        profileType: profileType || undefined,
        categoryId: categoryId || undefined,
        logoUrl: logoUrl.trim() || undefined,
        primaryColor: primaryColor.trim() || undefined,
        allowedSocial: ['instagram'],
      }).unwrap();

      if (brand.connectUrl) {
        setConnectUrl(brand.connectUrl);
        setStep('success');
      } else {
        // No debería pasar (BrandsService siempre agrega connectUrl al
        // crear), pero si Ayrshare no está configurado no se rompe el flujo.
        handleClose();
      }
    } catch {
      setError('No se pudo crear la marca. Verifica los datos e intenta de nuevo.');
    }
  }

  return (
    <FormDialog
      open={open}
      title={step === 'form' ? 'Nueva marca' : 'Marca creada'}
      maxWidth="sm"
      confirmLabel={step === 'form' ? (isCreating ? 'Creando…' : 'Crear') : 'Listo'}
      confirmDisabled={step === 'form' && (!name.trim() || !slug.trim() || !colorValid || isCreating)}
      onClose={handleClose}
      onConfirm={step === 'form' ? handleCreate : handleClose}
    >
      {step === 'form' ? (
        <>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Stack direction="row" alignItems="center" gap={2} sx={{ mb: 2.5 }}>
            <Box sx={{ position: 'relative' }}>
              <Avatar
                src={logoUrl || undefined}
                sx={{ width: 56, height: 56, bgcolor: primaryColor || '#616161', color: '#fff', fontWeight: 700 }}
              >
                {getInitials(name || 'M').toUpperCase()}
              </Avatar>
              <IconButton
                size="small"
                onClick={() => logoInputRef.current?.click()}
                disabled={isUploadingLogo}
                aria-label="Subir logo"
                sx={{
                  position: 'absolute',
                  bottom: -4,
                  right: -4,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  '&:hover': { bgcolor: 'primary.light' },
                }}
              >
                {isUploadingLogo ? <CircularProgress size={14} /> : <PhotoCameraOutlinedIcon fontSize="small" />}
              </IconButton>
              <input ref={logoInputRef} type="file" accept="image/*" hidden onChange={handleLogoChange} />
            </Box>
            <Typography variant="caption" color="text.secondary">Logo de la marca (opcional)</Typography>
          </Stack>
          <LabeledField
            label="Nombre"
            placeholder="Ej. Café Aurora"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            autoFocus
          />
          <LabeledField
            label="Slug"
            placeholder="cafe-aurora"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value));
            }}
            required
          />
          <LabeledSelect
            label="Tipo (opcional)"
            value={profileType}
            onChange={(e) => setProfileType(e.target.value as string)}
            displayEmpty
          >
            <MenuItem value=""><em>Sin especificar</em></MenuItem>
            {BRAND_TYPE_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </LabeledSelect>
          <LabeledSelect
            label="Categoría (opcional)"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value as string)}
            displayEmpty
          >
            <MenuItem value=""><em>Sin categoría</em></MenuItem>
            {categories.map((cat) => (
              <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
            ))}
          </LabeledSelect>
          <Box sx={{ mb: 2.5 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.75, fontWeight: 500, fontSize: 14 }}>
              Color primario (opcional)
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75 }}>
              Fondo del avatar mientras no haya logo — se ve reflejado arriba al elegirlo.
            </Typography>
            <Stack direction="row" gap={1} alignItems="center">
              <Box
                component="input"
                type="color"
                value={primaryColor || '#616161'}
                onChange={(e) => setPrimaryColor((e.target as HTMLInputElement).value)}
                sx={{ width: 44, height: 44, p: 0, border: '1px solid', borderColor: 'divider', borderRadius: 2, cursor: 'pointer', bgcolor: 'transparent' }}
              />
              <TextField
                size="small"
                fullWidth
                placeholder="#E0A800"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                error={!colorValid}
                helperText={!colorValid ? 'Formato inválido — usa #RGB o #RRGGBB' : ' '}
                sx={{ flex: 1 }}
              />
            </Stack>
          </Box>
        </>
      ) : (
        <Stack gap={2}>
          <Alert severity="success">La marca se creó correctamente.</Alert>
          <Typography variant="body2" color="text.secondary">
            Para publicar contenido real, conecta tus redes sociales desde el enlace de Ayrshare —
            ábrelo, inicia sesión con tu cuenta de Instagram Business/Creator y confirma la conexión.
          </Typography>
          <Box>
            <Button
              variant="contained"
              color="primary"
              endIcon={<OpenInNewIcon />}
              href={connectUrl ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
            >
              Conectar redes sociales
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary">
            Cuando termines de conectar, vuelve aquí y sincroniza las cuentas conectadas.
          </Typography>
        </Stack>
      )}
    </FormDialog>
  );
}
