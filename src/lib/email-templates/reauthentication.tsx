import * as React from 'react'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre code de vérification</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Rollsy</Text>
        <Heading style={h1}>Confirmez votre identité</Heading>
        <Text style={text}>Utilisez le code ci-dessous pour confirmer votre identité :</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          Ce code expire rapidement. Si vous n'êtes pas à l'origine de cette
          demande, ignorez cet e-mail.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

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
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '26px',
  letterSpacing: '4px',
  fontWeight: 'bold' as const,
  color: '#1a1a1a',
  backgroundColor: '#FFE600',
  border: '3px solid #1a1a1a',
  borderRadius: '16px',
  padding: '12px 18px',
  display: 'inline-block',
  margin: '0 0 30px',
}
const footer = { fontSize: '12px', color: '#8a8a8a', margin: '28px 0 0' }
