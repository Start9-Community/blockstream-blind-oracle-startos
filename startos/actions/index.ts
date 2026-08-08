import { sdk } from '../sdk'
import { showOracleDetails } from './showOracleDetails'

export const actions = sdk.Actions.of().addAction(showOracleDetails)
