/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({ siteName, siteUrl, recipient, confirmationUrl }: SignupEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Confirme seu email para COGNOS Study.AI</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src="https://cognosstudyai.lovable.app/logo-cognos.png" width="48" height="48" alt="COGNOS" style={{ borderRadius: '12px', marginBottom: '16px' }} />
        <Heading style={h1}>Confirme seu email</Heading>
        <Text style={text}>
          Obrigado por se cadastrar no{' '}
          <Link href={siteUrl} style={link}><strong>COGNOS Study.AI</strong></Link>!
          Sua jornada de estudos inteligente começa agora.
        </Text>
        <Text style={text}>
          Confirme seu email ({' '}
          <Link href={`mailto:${recipient}`} style={link}>{recipient}</Link>
          ) clicando no botão abaixo:
        </Text>
        <Button style={button} href={confirmationUrl}>Verificar Email</Button>
        <Text style={footer}>Se você não criou uma conta, ignore este email com segurança.</Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#0d1117', fontFamily: "'Space Grotesk', 'Inter', Arial, sans-serif" }
const container = { padding: '32px 28px', backgroundColor: '#151b25', borderRadius: '12px', margin: '40px auto', maxWidth: '480px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#e5e7eb', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#7b8794', lineHeight: '1.6', margin: '0 0 24px' }
const link = { color: '#1ec8e6', textDecoration: 'underline' }
const button = { backgroundColor: '#1ec8e6', color: '#0d1117', fontSize: '14px', fontWeight: 'bold' as const, borderRadius: '12px', padding: '12px 24px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#555d68', margin: '30px 0 0' }
