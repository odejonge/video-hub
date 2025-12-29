import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { Strategy as FacebookStrategy } from 'passport-facebook'
import { prisma } from './db.js'

export function configurePassport() {
  // Google Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: `${process.env.BACKEND_URL}/auth/google/callback`,
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value
            if (!email) {
              return done(new Error('No email provided by Google'))
            }

            let user = await prisma.user.findUnique({
              where: {
                provider_providerId: {
                  provider: 'google',
                  providerId: profile.id,
                },
              },
            })

            if (!user) {
              user = await prisma.user.create({
                data: {
                  email,
                  name: profile.displayName,
                  avatar: profile.photos?.[0]?.value,
                  provider: 'google',
                  providerId: profile.id,
                  credits: 10,
                },
              })
            }

            done(null, user)
          } catch (error) {
            done(error as Error)
          }
        }
      )
    )
  }

  // Facebook Strategy
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(
      new FacebookStrategy(
        {
          clientID: process.env.FACEBOOK_APP_ID,
          clientSecret: process.env.FACEBOOK_APP_SECRET,
          callbackURL: `${process.env.BACKEND_URL}/auth/facebook/callback`,
          profileFields: ['id', 'emails', 'name', 'displayName', 'picture.type(large)'],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value
            if (!email) {
              return done(new Error('No email provided by Facebook'))
            }

            let user = await prisma.user.findUnique({
              where: {
                provider_providerId: {
                  provider: 'facebook',
                  providerId: profile.id,
                },
              },
            })

            if (!user) {
              user = await prisma.user.create({
                data: {
                  email,
                  name: profile.displayName,
                  avatar: profile.photos?.[0]?.value,
                  provider: 'facebook',
                  providerId: profile.id,
                  credits: 10,
                },
              })
            }

            done(null, user)
          } catch (error) {
            done(error as Error)
          }
        }
      )
    )
  }
}


