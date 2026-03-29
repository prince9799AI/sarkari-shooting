from .views import IndexView, NewDesigneView, ContactView, FilmDetailView
from django.urls import path


urlpatterns = [
    path("second2", IndexView.as_view(), name='index'),
    path("", NewDesigneView.as_view(), name='new_designe'),
    path("contact/", ContactView.as_view(), name='contact'),
    path("portfolio/<int:pk>/", FilmDetailView.as_view(), name='film_detail'),
]