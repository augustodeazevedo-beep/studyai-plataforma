/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu link de acesso - Study.AI</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Seu link de acesso</Heading>
        <Text style={text}>Clique no botão abaixo para acessar o Study.AI. Este link expira em breve.</Text>
        <Button style={button} href={confirmationUrl}>Entrar</Button>
        <Text style={footer}>Se você não solicitou este link, ignore este email com segurança.</Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#0d1117', fontFamily: "'Space Grotesk', 'Inter', Arial, sans-serif" }
const container = { padding: '32px 28px', backgroundColor: '#151b25', borderRadius: '12px', margin: '40px auto', maxWidth: '480px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#e5e7eb', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#7b8794', lineHeight: '1.6', margin: '0 0 24px' }
const button = { backgroundColor: '#1ec8e6', color: '#0d1117', fontSize: '14px', fontWeight: 'bold' as const, borderRadius: '12px', padding: '12px 24px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#555d68', margin: '30px 0 0' }
