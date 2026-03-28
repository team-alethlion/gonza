from cuid2 import cuid_wrapper

# Create a CUID generator
cuid_gen = cuid_wrapper()

def generate_id(prefix=""):
    """
    Generates a secure unique ID with an optional prefix.
    """
    base_id = cuid_gen()
    if prefix:
        return f"{prefix}-{base_id}"
    return base_id

# Specific generators for common models to simplify field definitions
def gen_us_id(): return generate_id("us")
def gen_ro_id(): return generate_id("ro")
def gen_pe_id(): return generate_id("pe")
def gen_pt_id(): return generate_id("pt")
def gen_dr_id(): return generate_id("dr")
def gen_ev_id(): return generate_id("ev")

# Core App
def gen_pa_id(): return generate_id("pa")
def gen_ag_id(): return generate_id("ag")
def gen_br_id(): return generate_id("br")
def gen_bc_id(): return generate_id("bc")
def gen_bs_id(): return generate_id("bs")
def gen_sc_id(): return generate_id("sc")
def gen_st_id(): return generate_id("st")
def gen_tc_id(): return generate_id("tc")
def gen_ta_id(): return generate_id("ta")
def gen_ah_id(): return generate_id("ah")

# Inventory
def gen_su_id(): return generate_id("su")
def gen_ca_id(): return generate_id("ca")
def gen_pr_id(): return generate_id("pr")
def gen_au_id(): return generate_id("au")
def gen_ai_id(): return generate_id("ai")
def gen_ph_id(): return generate_id("ph")
def gen_tr_id(): return generate_id("tr")
def gen_ti_id(): return generate_id("ti")
def gen_re_id(): return generate_id("re")
def gen_ri_id(): return generate_id("ri")

# Finance
def gen_ac_id(): return generate_id("ac")
def gen_ct_id(): return generate_id("ct")
def gen_ec_id(): return generate_id("ec")
def gen_ex_id(): return generate_id("ex")
def gen_tx_id(): return generate_id("tx")
def gen_ci_id(): return generate_id("ci")

# Customers
def gen_cc_id(): return generate_id("cc")
def gen_cu_id(): return generate_id("cu")
def gen_fc_id(): return generate_id("fc")
def gen_tk_id(): return generate_id("tk")
def gen_cl_id(): return generate_id("cl")

# Sales
def gen_sg_id(): return generate_id("sg")
def gen_slc_id(): return generate_id("slc")
def gen_sa_id(): return generate_id("sa")
def gen_si_id(): return generate_id("si")
def gen_ip_id(): return generate_id("ip")

# Messaging
def gen_cp_id(): return generate_id("cp")
def gen_me_id(): return generate_id("me")
def gen_mt_id(): return generate_id("mt")
def gen_ws_id(): return generate_id("ws")
