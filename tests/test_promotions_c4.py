from pathlib import Path
import unittest,importlib.util,copy
spec=importlib.util.spec_from_file_location('promotion_engine',Path(__file__).resolve().parents[1]/'tools/promotion_engine.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Tests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.src=m.sources();cls.seed=m.defaults(cls.src)
 def test_templates(self):
  state=m.replay(self.seed,*self.src)
  self.assertEqual(state['campaign_count'],18)
  self.assertEqual(sum(x['status']=='active' for x in state['campaigns']),8)
  self.assertEqual(len(m.public_view(state,*self.src[1:])['campaigns']),8)
 def test_owner_denied(self):
  first=next(e for e in self.seed if e['campaign']['owner_scope']=='shop' and e['campaign']['status']=='active')
  fake=m.new_event('updated',first['campaign_id'],'demo',owner_scope='shop',shop_slug='different-shop',expected_revision=1,changes={'discount_bps':100})
  with self.assertRaises(ValueError):m.replay([first,fake],*self.src)
 def test_non_stack_best(self):
  state=m.replay(self.seed,*self.src)
  self.assertEqual(state['rules']['stacking'],'best_eligible_only')
 def test_refuse_property(self):
  shop='soko-properties';prop=next(sku for sku,x in self.src[1].items() if x['shop_slug']==shop)
  e=next(e for e in self.seed if e['campaign']['shop_slug']==shop)
  bad=copy.deepcopy(e);bad['campaign']['target_skus']=[prop];bad['campaign']['status']='active'
  with self.assertRaises(ValueError):m.replay([bad],*self.src)
 def test_c5_only(self):
  e=next(e for e in self.seed if e['campaign']['type']=='free_shipping');bad=copy.deepcopy(e);bad['campaign']['status']='active'
  with self.assertRaises(ValueError):m.replay([bad],*self.src)
 def test_future_sku_no_silent_discount(self):
  state=m.replay(self.seed,*self.src)
  self.assertTrue(all('OS-NGR-000031' not in c['target_skus'] for c in state['campaigns']))
 def test_rate_invariance(self):
  self.assertEqual(m.RULES['currency_base'],'USD')
 def test_discount_validation(self):
  self.assertEqual(m.percent('12.5'),1250)
  for bad in ('51','-1','abc','1.001'):
   with self.assertRaises(ValueError):m.percent(bad)
if __name__=='__main__':unittest.main(verbosity=1)
