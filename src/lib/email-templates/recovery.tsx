import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Réinitialisez votre mot de passe {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Rollsy</Text>
        <Heading style={h1}>Réinitialisez votre mot de passe</Heading>
        <Text style={text}>
          Nous avons reçu une demande de réinitialisation de votre mot de passe
          {siteName}. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.
        </Text>
        <Button className="dm-btn" style={button} href={confirmationUrl}>
          Choisir un nouveau mot de passe
        </Button>
        <Text style={footer}>
          Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail :
          votre mot de passe restera inchangé.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Nunito', 'Trebuchet MS', Arial, sans-serif",
}
const container = {
  padding: '28px 26px',
  maxWidth: '560px',
  border: '3px solid #1a1a1a',
  borderRadius: '24px',
  backgroundColor: '#ffffff',
}
const brand = {
  fontSize: '13px',
  fontWeight: 'bold' as const,
  letterSpacing: '2px',
  textTransform: 'uppercase' as const,
  color: '#FF3DA6',
  margin: '0 0 6px',
}
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#1a1a1a',
  margin: '0 0 20px',
}
const text = {
  fontSize: '15px',
  color: '#3a3a3a',
  lineHeight: '1.6',
  margin: '0 0 22px',
}
const button = {
  backgroundColor: '#FF3DA6',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  border: '3px solid #1a1a1a',
  borderRadius: '999px',
  padding: '13px 26px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#8a8a8a', margin: '28px 0 0' }
// Rendered as a text child, which React may HTML-escape: keep this CSS free of >, &, and quotes.
const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    .dm-btn { background-color: #FF3DA6 !important; color: #ffffff !important; }
  }
  [data-ogsc] .dm-btn { background-color: #FF3DA6 !important; color: #ffffff !important; }
  [data-ogsb] .dm-btn { background-color: #FF3DA6 !important; color: #ffffff !important; }
`
