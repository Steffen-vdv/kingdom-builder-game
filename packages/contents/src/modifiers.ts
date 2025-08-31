import { modifierInfo } from './config/builders';

export const MODIFIER_INFO = {
  cost: modifierInfo().id('cost').icon('💲').label('Cost Modifier').build(),
  result: modifierInfo()
    .id('result')
    .icon('✨')
    .label('Result Modifier')
    .build(),
} as const;
