/**
 * TatvaOps Vision - Sign In Page
 * 
 * Clerk sign-in component wrapped in MUI for consistency
 */

import { SignIn } from '@clerk/nextjs';
import { Box } from '@mui/material';

export default function SignInPage() {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        '& .cl-rootBox': {
          width: '100%',
        },
        '& .cl-card': {
          boxShadow: 'none !important',
          border: 'none !important',
        },
      }}
    >
      <SignIn
        afterSignInUrl="/entry"
        appearance={{
          elements: {
            rootBox: 'w-full',
            card: 'shadow-none border-0',
            headerTitle: 'text-2xl font-semibold',
            headerSubtitle: 'text-gray-600',
            socialButtonsBlockButton: 'border border-gray-200 hover:bg-gray-50',
            formButtonPrimary: 'bg-primary hover:bg-primary-dark',
            footerActionLink: 'text-primary hover:text-primary-dark',
          },
        }}
      />
    </Box>
  );
}
