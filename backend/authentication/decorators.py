from django.contrib.auth.decorators import user_passes_test




def doctor_required(view_func):
    return user_passes_test(
        lambda u: u.is_authenticated and u.groups.filter(name="Doctor").exists()
    )(view_func)


def patient_required(view_func):
    return user_passes_test(
        lambda u: u.is_authenticated and u.groups.filter(name="Patient").exists()
    )(view_func)


def master_required(view_func):
    return user_passes_test(
        lambda u: u.is_authenticated and u.groups.filter(name="MasterUser").exists()
    )(view_func)