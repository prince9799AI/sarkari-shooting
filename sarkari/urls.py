from .views import IndexView, NewDesigneView, ContactView
from django.urls import path


urlpatterns = [
    path("", IndexView.as_view(), name='index'),
    path("new-design/", NewDesigneView.as_view(), name='new_designe'),
    path("contact/", ContactView.as_view(), name='contact'),
]