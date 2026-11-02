// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import {expect,it} from 'vitest';
import {sameSelection} from './setting-defaults';
it('compares effective selections without depending on order or duplicate storage entries',()=>{
  expect(sameSelection(['C','F','C'],['F','C'])).toBe(true);
  expect(sameSelection(['C'],['C','F'])).toBe(false);
  expect(sameSelection([],[])).toBe(true);
  expect(sameSelection([0,-1],[-1,0])).toBe(true);
});
